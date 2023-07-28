'use strict';

const assert = require('assert');
const tax = require('../tax');

describe('税金的计算', function () {
    describe('#税金计算的各辅助方法的测试', function () {
        it ('xxx', function () {
            const nerdamer = require("nerdamer/all.min");
            const sol = nerdamer.solveEquations(['y1=x1*(1+0.13)', 'y2=x2*(1+0.03)', 'y1=4', 'y2=6', '(y1+y2)/(x1+x2)-1=t']);

            console.log(sol);
        });

        it('测试税金计算通道是否正常的方法', function () {
            const isOk = tax.taxFuncTest();
            assert.equal(isOk, true);
        });

        it('测试方法buildFormulas', function () {
            let expectedTaxFormulas = ["t=p*(1+a)", "m=t*b", "w=p*b"];
            const taxRate = '0.03';
            const disc = 1;
            const qty = 2;
            const itemKey = 'TaxPrice'; //故意大写T, 是为测试传入的itemKey忽略大小写的特性
            const itemValue = 4680;
            expectedTaxFormulas = ['k=p*0.03*2', '4680=p*(1+0.03)', 'x=y*(1+0.03)', 'm=4680*2', 'w=p*2', "1=4680/x", "1=p/y"];

            const returnFormulas = tax.buildFormulas(taxRate, qty, disc, itemKey, itemValue);

            assert.equal(returnFormulas.findIndex(item => { return  item == "a=0.03" }) > -1,  true);
            assert.equal(returnFormulas.findIndex(item => { return  item == "d=1" }) > -1,  true);
            assert.equal(returnFormulas.findIndex(item => { return  item == "b=2" }) > -1,  true);
            assert.equal(returnFormulas.findIndex(item => { return  item == "t=4680" }) > -1,  true);
        });

        it('测试税金计算结果的转换', function () {
            const evelResult = [
                [ 'm', 9360 ],
                [ 'p', 4543.689320388349 ],
                [ 'w', 9087.378640776698 ]
            ]

            const taxObj = tax.trasfNerdamerResult(evelResult);
            assert.equal(taxObj.toalAmount, 9360);
        });

        it('测试传入无效的itemKey, 该key不是taxObj中的属性', function () {
            assert.throws(function () {tax.calcuTax(0.03, 1, 1, 'haha', 1)}, Error);
        });
    });

    describe('#税金计算核心逻辑测试，不打折', function () {
        it('测试税金的计算1：知道税率是0.03，数量是2，含税单价，计算其他项', function () {
            const taxRate = '0.03';
            const disc = 1;
            const qty = 2;
            const itemKey = 'taxPrice';
            const itemValue = 4680;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.03);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 4680);
            assert.equal(taxObj.price, tax.toFixed(4543.689320388349));    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(9087.378640776698)); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(272.621359223300971)); //税款
            assert.equal(taxObj.toalAmount, 9360); //价税合计金额
        });

        it('测试税金的计算2：知道税率是0.03，数量是2，价税合计，计算其他项', function () {
            const taxRate = 0.03;
            const disc = 1;
            const qty = 2;
            const itemKey = 'toalAmount';
            const itemValue = 9360;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.03);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 4680);
            assert.equal(taxObj.price, tax.toFixed(4543.689320388349));    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(9087.378640776698)); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(9360 - 9087.378640776698));  //税款
            assert.equal(taxObj.toalAmount, 9360); //价税合计金额
        });

        it('测试税金的计算3：知道税率是0.03，数量是2，未税单价，计算其他项', function () {
            const taxRate = 0.03;
            const disc = 1;
            const qty = 2;
            const itemKey = 'price';
            const itemValue = 4543.689320388349;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.03);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 4680);
            assert.equal(taxObj.price, tax.toFixed(4543.689320388349));    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(9087.378640776698)); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(9360 - 9087.378640776698));  //税款
            assert.equal(taxObj.toalAmount, 9360); //价税合计金额
        });

        it('测试税金的计算4：知道税率是0.01，数量是3，未税合计金额，计算其他项', function () {
            const taxRate = 0.01;
            const disc = 1;
            const qty = 3;
            const itemKey = 'goodsAmount';
            const itemValue = 16841.5841584158;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.01);
            assert.equal(taxObj.qty, 3);
            assert.equal(taxObj.taxPrice, 5670);
            assert.equal(taxObj.price, tax.toFixed(5613.86138613861));    //未税价
            assert.equal(taxObj.goodsAmount, 16841.5841584158); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(17010 - 16841.5841584158));  //税款
            assert.equal(taxObj.toalAmount, 17010); //价税合计金额
        });

        it('测试税金的计算5：知道税率是0.03，数量是2，税款，计算其他项', function () {
            const taxRate = 0.03;
            const disc = 1;
            const qty = 2;
            const itemKey = 'taxAmount';
            const itemValue = 272.6213592233;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.03);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 4680);
            assert.equal(taxObj.price, tax.toFixed(4543.689320388349));    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(9087.378640776698)); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(272.621359223300971))
            assert.equal(taxObj.toalAmount, 9360); //价税合计金额
        });

        it('测试税金的计算6：知道税率是0.13，数量是2，原始含税单价，折扣八折，计算其他项', function () {
            const taxRate = 0.13;
            const disc = 0.8;
            const qty = 2;
            const itemKey = 'oriTaxPrice';
            const itemValue = 273.75;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.13);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 219);
            assert.equal(taxObj.price, tax.toFixed(193.8053097345));    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(387.610619469)); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(50.389380531))
            assert.equal(taxObj.toalAmount, 438); //价税合计金额
            assert.equal(taxObj.oriTaxPrice, 273.75); //价税合计金额
            assert.equal(taxObj.oriPrice, tax.toFixed(242.2566371681)); //价税合计金额
        });

        it('测试税金的计算7：知道税率是0.13，数量是2，原始未税单价，折扣八折，计算其他项', function () {
            const taxRate = 0.13;
            const disc = 0.8;
            const qty = 2;
            const itemKey = 'oriPrice';
            const itemValue = 242.2566371681;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.13);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 219);
            assert.equal(taxObj.price, tax.toFixed(193.8053097345));    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(387.610619469)); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(50.389380531))
            assert.equal(taxObj.toalAmount, 437.9999999999); //价税合计金额
            assert.equal(taxObj.oriTaxPrice, 273.75); //价税合计金额
            assert.equal(taxObj.oriPrice, tax.toFixed(242.2566371681)); //价税合计金额
        });
    });

    describe('#税金计算核心逻辑测试, 提供打折', function () {
        it('测试税金的计算1：知道税率是0.03，数量2，含税单价，打八折，计算其他项', function () {
            const taxRate = 0.03;
            const disc = 0.8;
            const qty = 2;
            const itemKey = 'taxPrice';
            const itemValue = 4680;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.03);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 4680);
            assert.equal(taxObj.price, 4543.6893203883);    //未税价
            assert.equal(taxObj.goodsAmount, tax.toFixed(9087.378640776698)); //未税金额合计
            assert.equal(taxObj.oriTaxPrice, 5850);
            assert.equal(taxObj.oriPrice, tax.toFixed(5679.6116504854));
            assert.equal(taxObj.taxAmount, tax.toFixed(9360 - 9087.378640776698))
            assert.equal(taxObj.toalAmount, 9360); //价税合计金额
        });

        it('测试税金的计算2：知道税率是0.13，数量是2，未税合计金额，打八折，计算其他项', function () {
            const taxRate = 0.13;
            const disc = 0.8;
            const qty = 2;
            const itemKey = 'GoodsAmount';
            const itemValue = 387.610619469;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.13);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 219);
            assert.equal(taxObj.price, tax.toFixed(193.8053097345));    //未税价
            assert.equal(taxObj.goodsAmount, 387.610619469); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(50.389380531));  //税款
            assert.equal(taxObj.toalAmount, 438); //价税合计金额
        });
    });

    describe('#对税金计算核心逻辑，进行边界值的测试', function () {
        it('测试边界值情况下，税金的计算1：知道税率是0.03，数量2，含税单价为0，计算其他项', function () {
            const taxRate = '0.03';
            const disc = 0.8;
            const qty = 2;
            const itemKey = 'taxPrice';
            const itemValue = 0;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.03);
            assert.equal(taxObj.qty, 2);
            assert.equal(taxObj.taxPrice, 0);
            assert.equal(taxObj.price, 0);    //未税价
            assert.equal(taxObj.goodsAmount, 0); //未税金额合计
            assert.equal(taxObj.oriTaxPrice, 0);
            assert.equal(taxObj.oriPrice, tax.toFixed(0));
            assert.equal(taxObj.toalAmount, 0); //价税合计金额
        });

        it('测试边界值情况下，税金的计算1：知道税率是0.13，数量是-2，未税合计金额，打八折，计算其他项', function () {
            const taxRate = '0.13';
            const disc = 0.8;
            const qty = -2;
            const itemKey = 'GoodsAmount';
            const itemValue = 387.610619469;
            const taxObj = tax.calcuTax(taxRate, qty, disc, itemKey, itemValue);
            assert.equal(taxObj.taxRate, 0.13);
            assert.equal(taxObj.qty, -2);
            assert.equal(taxObj.taxPrice, 219);
            assert.equal(taxObj.price, tax.toFixed(193.8053097345));    //未税价
            assert.equal(taxObj.goodsAmount, -387.610619469); //未税金额合计
            assert.equal(taxObj.taxAmount, tax.toFixed(-50.389380531));  //税款
            assert.equal(taxObj.toalAmount, -438); //价税合计金额
        });
    });
});