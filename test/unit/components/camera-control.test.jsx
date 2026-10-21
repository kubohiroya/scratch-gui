import '../../helpers/controls-dom-setup.js';
import React from 'react';
import {mount} from 'enzyme';
import CameraControl from '../../../src/components/camera-control/camera-control.jsx';
import {createCameraControlsService} from '../../../src/lib/tw-camera-controls.js';

const settle = async () => { await Promise.resolve(); await Promise.resolve(); };

test('native permission content moves into one panel, closes safely and returns focus', async () => {
    const service = createCameraControlsService();
    const native = document.createElement('usermedia');
    const onOpen = jest.fn();
    const onClose = jest.fn();
    const handle = service.api.registerProvider({id: 'native', cameraId: 'pose', kind: 'permission',
        element: native, onOpen, onClose});
    const attached = document.createElement('div');
    document.body.appendChild(attached);
    const component = mount(<CameraControl label="カメラ" closeLabel="閉じる"
        snapshot={service.snapshot()} service={service} />, {attachTo: attached});
    const unsubscribe = service.subscribe(() => component.setProps({snapshot: service.snapshot()}));
    component.find('button[data-extension-stage-control="camera"]').simulate('click');
    await settle();
    expect(document.querySelector('[data-editor-camera-panel] usermedia')).toBe(native);
    expect(onOpen).toHaveBeenCalledTimes(1);
    document.dispatchEvent(new window.KeyboardEvent('keydown', {key: 'Escape', bubbles: true}));
    expect(document.querySelector('[data-editor-camera-panel]')).toBe(null);
    expect(native.parentNode).toBe(null);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(component.find('button[data-extension-stage-control="camera"]').getDOMNode());
    component.find('button[data-extension-stage-control="camera"]').simulate('click');
    await settle();
    handle.dispose();
    expect(document.querySelector('[data-editor-camera-panel]')).toBe(null);
    expect(component.find('button').exists()).toBe(false);
    unsubscribe(); component.unmount(); attached.remove();
});

test('inactive settings ask the provider to mount permission and running settings open normally', async () => {
    const service = createCameraControlsService();
    const onStart = jest.fn();
    const onOpen = jest.fn();
    const element = document.createElement('div');
    const handle = service.api.registerProvider({id: 'settings', kind: 'settings', element, onStart, onOpen});
    const component = mount(<CameraControl label="カメラ" closeLabel="閉じる"
        snapshot={service.snapshot()} service={service} />);
    const unsubscribe = service.subscribe(() => component.setProps({snapshot: service.snapshot()}));
    component.find('button[data-extension-stage-control="camera"]').simulate('click'); await settle();
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onOpen).toHaveBeenCalledTimes(1);
    handle.update({running: true}); await settle();
    expect(onOpen).toHaveBeenCalledTimes(2);
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-camera-mode="settings"]')).not.toBe(null);
    unsubscribe(); component.unmount();
});
