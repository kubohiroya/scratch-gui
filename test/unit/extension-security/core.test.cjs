require('./helpers.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {installBatchExtensionLoader}=require('@kubohiroya/turbowarp-extension-security-dialog/turbowarp');



test('real VM opens refused-extension projects and preserves their blocks and source URLs on save', async () => {
    const VM = require('scratch-vm');
    const vm = new VM();
    const url='data:text/javascript,throw%20new%20Error(%22must%20not%20run%22)';
    const restore=installBatchExtensionLoader(vm, entries=>new Map(entries.map(e=>[e.url,'deny'])),{});
    const project={targets:[{isStage:true,name:'Stage',variables:{},lists:{},broadcasts:{},comments:{},
        blocks:{retained:{opcode:'refused_test',next:null,parent:null,inputs:{},fields:{},shadow:false,topLevel:true,x:0,y:0}},
        currentCostume:0,costumes:[],sounds:[],volume:100,layerOrder:0,tempo:60,videoTransparency:50,videoState:'on',textToSpeechLanguage:null}],
        monitors:[],extensions:['refused'],extensionURLs:{refused:url},meta:{semver:'3.0.0'}};
    try {
        await vm.loadProject(project);
        assert.equal(vm.runtime.targets.length,1);
        assert.equal(vm.runtime.targets[0].blocks.getBlock('retained').opcode,'refused_test');
        assert.equal(vm.extensionManager.isExtensionLoaded('refused'),false);
        const saved=JSON.parse(vm.toJSON());
        assert.equal(saved.extensionURLs.refused,url);
        assert.ok(Object.values(saved.targets[0].blocks).some(block=>block.opcode==='refused_test'));
    } finally {restore();vm.quit();vm.clear();}
});
