import '../../helpers/controls-dom-setup.js';
import React from 'react';
import {mountWithIntl} from '../../helpers/intl-helpers.jsx';
import Controls from '../../../src/components/controls/controls';
import TurboMode from '../../../src/components/turbo-mode/turbo-mode';
import GreenFlag from '../../../src/components/green-flag/green-flag';
import StopAll from '../../../src/components/stop-all/stop-all';

describe('Controls component', () => {
    const defaultProps = () => ({
        active: false,
        onGreenFlagClick: jest.fn(),
        onStopAllClick: jest.fn(),
        turbo: false
    });

    test('shows turbo mode when in turbo mode', () => {
        const component = mountWithIntl(
            <Controls
                {...defaultProps()}
            />
        );
        expect(component.find(TurboMode).exists()).toEqual(false);
        component.setProps({turbo: true});
        expect(component.find(TurboMode).exists()).toEqual(true);
    });

    test('triggers the right callbacks when clicked', () => {
        const props = defaultProps();
        const component = mountWithIntl(
            <Controls
                {...props}
            />
        );
        component.find(GreenFlag).simulate('click');
        expect(props.onGreenFlagClick).toHaveBeenCalled();

        component.find(StopAll).simulate('click');
        expect(props.onStopAllClick).toHaveBeenCalled();
    });
    test('renders visible extension controls after stop with native click and accessibility state', () => {
        const onClick = jest.fn();
        const component = mountWithIntl(<Controls
            {...defaultProps()}
            extensionControls={[
                {id: 'hidden', label: '待機', visible: false},
                {id: 'reload', label: '自動リロードの設定', text: '監視中', icon: '↻',
                    visible: true, expanded: false, onClick}
            ]}
        />);
        const button = component.find('button[data-extension-stage-control="reload"]');
        expect(component.find('[data-extension-stage-control="hidden"]').exists()).toBe(false);
        expect(button.prop('aria-expanded')).toBe(false);
        button.simulate('click');
        expect(onClick).toHaveBeenCalledTimes(1);
        expect(component.find(StopAll).getDOMNode().nextElementSibling).toBe(button.getDOMNode());
        component.setProps({isSmall: true});
        expect(component.find('button[data-extension-stage-control="reload"]').text()).toBe('↻');
        expect(component.find('button[data-extension-stage-control="reload"]').prop('aria-label')).toBe('自動リロードの設定');
        component.unmount();
    });

});
