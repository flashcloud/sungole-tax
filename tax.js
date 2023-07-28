#! /usr/bin/env node
const nerdamer = require("nerdamer/all.min");

/**
 * 测试税金计算是否准备好
 * @return {boolean}
 */
function taxFuncTest() {
    let ret = false;

    try {
        const sol = nerdamer.solveEquations(['x = y + 3', 'y = 1']);
        ret = sol.toString() == "x,4,y,1";
    } catch (e) {
        console.log('Test tax function is ERR:' + e.toString());
    }

    return ret;
}

/**
 * 使用线性代数方程方式计算税项
 * @param taxRate
 * @param qty
 * @param disc
 * @param otherItemKey
 * @param otherItemValue
 * @param session
 * @return {{taxRate: {name: string, value: null}, price: {name: string, value: null}, qty: {name: string, value: null}, goodsAmount: {name: string, value: null}, taxPrice: {name: string, value: null}, toalAmount: {name: string, value: null}}|*[]|null}
 */
function calcuTaxFacade(taxRate, qty, disc, otherItemKey, otherItemValue, session) {
    let calcuRet = calcuTax(taxRate, qty, disc, otherItemKey, otherItemValue);

    //如果计算返回null，则为用户的调用返回{err: true}
    if (calcuRet == null)
        calcuRet = {err: true};
    else
        calcuRet.err = false;

    //如果有传入session
    if (session !== undefined)
        calcuRet.session = session;
    else
        calcuRet.session = '';

    return calcuRet;
}

/**
 * 使用线性代数方程方式计算税项
 * @param taxRate
 * @param qty
 * @param disc
 * @param otherItemKey
 * @param otherItemValue
 * @return {{taxRate: {name: string, value: null}, price: {name: string, value: null}, qty: {name: string, value: null}, goodsAmount: {name: string, value: null}, taxPrice: {name: string, value: null}, toalAmount: {name: string, value: null}}|*[]|null}
 */
function calcuTax(taxRate, qty, disc, otherItemKey, otherItemValue) {
    //参数的有效性检查
    if (taxRate == undefined ||
        qty == undefined ||
        disc == undefined ||
        otherItemKey == undefined ||
        otherItemValue == undefined)
        return null;
    const regExp =/^-?[0-9]+(\.[0-9]+)?$/;
    if (!regExp.test(taxRate) || !regExp.test(qty) || !regExp.test(disc) || !regExp.test(otherItemValue)) return null;
    //TODO 各项能允许的最大值

    //对传入的税项字符串验证其合法性
    let validOtherItemKey = '';
    validOtherItemKey = isExistsItemKey(otherItemKey, function (isExists, attrs) {
        if (!isExists)
            throw new Error('传入的参数otherItemKey值' + otherItemKey + '不合法。必须是以下中的任意一项：' + attrs.join(', '));
    });
    if (validOtherItemKey === '') return null;

    //只能数量是负数
    const isNegative = qty < 0;
    qty = Math.abs(qty);
    taxRate = Math.abs(taxRate);
    disc = Math.abs(disc);
    otherItemValue = Math.abs(otherItemValue);

    let evelTaxObj = {};

    let ret = [];
    //对提供的常量及输入的变量值代入表达式进行替换
    const taxFormulas = buildFormulas(taxRate, qty, disc, otherItemKey, otherItemValue);
    if (taxFormulas === '')
        return ret; //传入的参数名称otherItemKey不合法 //TODO,需要返回错误提示给用户，提醒传入的值无效

    //调用nerdamer进行税金方程式进行求解
    const sol = nerdamer.solveEquations(taxFormulas);
    //转换求解结果为简化的JSON格式用于输出
    evelTaxObj = trasfNerdamerResult(sol);

    //处理数量是负数的情况
    if (isNegative) {
        const taxDef = cloneTaxObj();
        for (const key in taxDef) {
            if (taxDef[key].negative) {
                evelTaxObj[key] = evelTaxObj[key] * (-1);
            }
        }
    }

    return evelTaxObj;
}

/**
 * 将nerdamer计算的税金结果转换成JSON格式
 * @param evlResult
 * @return {{taxRate: {name: string, value: null}, price: {name: string, value: null}, qty: {name: string, value: null}, goodsAmount: {name: string, value: null}, taxPrice: {name: string, value: null}, toalAmount: {name: string, value: null}}}
 */
function trasfNerdamerResult(evlResult) {
    let taxObj = cloneTaxObj();
    for (const key in taxObj) {
        const taxItem = taxObj[key];
        for (const retItem of evlResult) {
            const retItemKey = retItem[0];
            const retItemValue = retItem[1];
            if (retItemKey == taxItem.name) {
                taxItem.value = toFixed(retItemValue);    //保留10位小数;
            }
        }
    }

    let ret = {};
    for (const attr in taxObj) {
        ret[attr] = taxObj[attr].value;
    }

    return ret;
}

/**
 * 小数保留精度
 * @return {number}
 */
function toFixed(amount) {
    return amount.toFixed(10);
}

/**
 * 根据传入的变量值，为税金的计算准备好合法的计算公式
 * @param taxRate
 * @param qty
 * @param otherItemKey
 * @param otherItemValue
 * @return {string[]|string}
 */
function buildFormulas(taxRate, qty, disc, otherItemKey, otherItemValue) {
    let ret = '';

    let taxObj = cloneTaxObj();
    taxObj.taxRate.value = taxRate;
    taxObj.qty.value = qty;
    taxObj.disc.value = disc;

    //将传入的某项用户输入的变量（otherItemKey）进行赋值（otherItemValue）给taxObj
    let findItemKey = isExistsItemKey(otherItemKey);
    if (findItemKey !== '') taxObj[findItemKey].value = otherItemValue;

    if (findItemKey === '')
        return ret;

    //重要！！！税金计算公式
    //以下是公式说明：(公式中各变量名称必须与方法cloneTaxObj()中，taxObj.xx.name中的name值严格一致)
    //      税款:                       税款(k)=未税价(p) x 税率(a) x 数量(b)
    //      含税价：     t=p*(1+a)       含税价(t) = 未税价(p) x (1 + 税率(a))
    //      原始含税价：  x=y*(1+a)       原始含税价(x) = 原始未税价(y) x (1 + 税率(a))
    //      价税合计：   m=t*b           价税合计(m) = 含税价(t) x 数量(b)
    //      未税合计：   w=p*b           未税合计(w) = 未税价(p) x 数量(b)
    //      折扣:       d=t/x           折扣(d) = 含税价(t) / 原始含税价(x)
    let taxFormulas = ["k=p*a*b", "t=p*(1+a)", "x=y*(1+a)", "m=t*b", "w=p*b", "d=t/x"];

    //在公式数组中代入已知值的变量
    for(const key in taxObj) {
        let item = taxObj[key];
        if(item.value !== null)
            taxFormulas.push(`${item.name}=${item.value}`);
    }

    return  taxFormulas;
}

/////////////////////////////PRVATE
/**
 * 传入的税项是否是合法的。(与cloneTaxObj()方法中定义的taxObj的属性相符)
 * @param itemKey 忽略大小写
 * @param callback 参数1：是否存在这个itemKey, 参数2：传入税项对象的各属性key值
 * @return {string} 如果存在这个key,则返回它,如果不存在，则返回空字串
 */
function isExistsItemKey(itemKey, callback) {
    let attrs = [];
    let existsKey = '';
    const taxObj = cloneTaxObj();
    for(const key in taxObj) {
        if (key.toLowerCase() == itemKey.toLowerCase()) existsKey = key;
        attrs.push(key);
    }
    if (callback !== undefined) callback((existsKey === '' ? false : true), attrs);
    return existsKey
}

function cloneTaxObj() {
    //变量说明：
    //税率 taxRate：    a
    //数量 qty：    b
    //含税单价 taxPrice： t
    //未税单价 price： p
    //未税合计： w
    //税款:     k
    //价税合计： m
    const taxObj = {
        taxRate: {name: 'a', value: null, negative: false}, //常量。其中name对应方法buildFormulas()内部的taxFormulas表达式中，其值的各项变量名称
        disc: {name: 'd', value: null, negative: false},    //常量
        qty: {name: 'b', value: null, negative: true},     //常量
        taxPrice: {name: 't', value: null, negative: false},
        price: {name: 'p', value: null, negative: false},
        goodsAmount: {name: 'w', value: null, negative: true},
        taxAmount: {name: 'k', value: null, negative: true},
        toalAmount: {name: 'm', value: null, negative: true},
        oriTaxPrice: {name: 'x', value: null, negative: false},
        oriPrice: {name: 'y', value: null, negative: false}
    }
    //重要！！！客户端调用时传入的参数itemKey要与上面的taxObj的属性值一致！！！

    //有必要检查上述的{name: 'x', value: null}中指定的name属性有无重复，不能重复，这是为了规避开发时定义此taxObj不正确
    let vNames = [];
    for(const key in taxObj) {
        const vName = taxObj[key].name;
        if (vNames.indexOf(vName) > -1)
            throw new Error('重复的name值。' + vName + '\n\n定义的taxObj属性' +  key + ', 存在重复的name值' + vName);
        else
            vNames.push(vName);
    }

    return taxObj;
}

module.exports = {
    taxFuncTest: taxFuncTest,
    calcuTaxFacade: calcuTaxFacade,
    calcuTax: calcuTax,
    trasfNerdamerResult: trasfNerdamerResult,
    buildFormulas: buildFormulas,
    toFixed: toFixed
};