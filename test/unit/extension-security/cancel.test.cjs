require('./helpers.cjs');
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {JSDOM}=require('jsdom');
const {default:reducer,LoadingState,onFetchedProjectData,onLoadedProject}=require('../../../src/reducers/project-state');
const returnToEditorStart=require('../../../src/lib/tw-extension-security-cancel').default;

test('confirmed cancellation resets loading state, title/handle/mode and removes project_url before fetching default',()=>{
    const dom=new JSDOM('',{url:'http://localhost/editor.html?project_url=https://example.test/project.sb3&token=secret#123'});
    globalThis.window=dom.window;
    let state={loadingState:LoadingState.LOADING_VM_FILE_UPLOAD,projectId:'123',projectData:'old',error:new Error('old')};
    const actions=[];
    returnToEditorStart(action=>{
        actions.push(action);
        if(action.type.endsWith('/CANCEL_SECURITY_LOAD')) assert.equal(new URL(window.location.href).searchParams.has('project_url'),false);
        state=reducer(state,action);
    });
    assert.equal(state.loadingState,LoadingState.FETCHING_NEW_DEFAULT);
    assert.equal(state.projectId,'0');assert.equal(state.projectData,null);assert.equal(state.error,null);
    assert.equal(new URL(window.location.href).searchParams.has('token'),false);
    assert.ok(actions.some(action=>action.type==='projectTitle/SET_PROJECT_TITLE'&&action.title===''));
    assert.ok(actions.some(action=>action.type.endsWith('/SET_PLAYER')&&action.isPlayerOnly===false));
    state=reducer(state,onFetchedProjectData('default-json',state.loadingState));
    assert.equal(state.loadingState,LoadingState.LOADING_VM_NEW_DEFAULT);
    state=reducer(state,onLoadedProject(state.loadingState,false,true));
    assert.equal(state.loadingState,LoadingState.SHOWING_WITHOUT_ID);
    dom.window.close();delete globalThis.window;
});
