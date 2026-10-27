require('./helpers.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');

test('security dialog keyup preserves native activation without forwarding keys to the VM',()=>{
    const dom=new JSDOM('<div class="twextsec-modal"><input type="radio"><button>OK</button></div><button id="outside">Outside</button>');
    globalThis.document=dom.window.document;
    const VMListener=require('../../../src/lib/vm-listener-hoc.jsx').default(()=>null).WrappedComponent;
    const posted=[];
    const listener=new VMListener({vm:{on(){},runtime:{on(){}},postIOData:(...args)=>posted.push(args)}});
    document.addEventListener('keyup',listener.handleKeyUp);
    try {
        for(const target of document.querySelectorAll('.twextsec-modal input, .twextsec-modal button')) {
            const event=new dom.window.KeyboardEvent('keyup',{key:' ',keyCode:32,bubbles:true,cancelable:true});
            target.dispatchEvent(event);
            assert.equal(event.defaultPrevented,false);
        }
        assert.deepEqual(posted,[]);
        const outside=new dom.window.KeyboardEvent('keyup',{key:' ',keyCode:32,bubbles:true,cancelable:true});
        document.getElementById('outside').dispatchEvent(outside);
        assert.equal(outside.defaultPrevented,true);
        assert.deepEqual(posted,[['keyboard',{key:' ',keyCode:32,isDown:false}]]);
    } finally {
        document.removeEventListener('keyup',listener.handleKeyUp);
        dom.window.close();delete globalThis.document;
    }
});
