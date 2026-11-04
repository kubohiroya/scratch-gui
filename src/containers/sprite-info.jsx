import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {getHostIntegration} from '../addons/hooks';
import SpriteInfoComponent from '../components/sprite-info/sprite-info.jsx';

const Panel = getHostIntegration()?.SpritePropertiesPanel;
export const hasHostSpriteProperties = Boolean(Panel);

class SpriteInfo extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleChangeProperties',
            'handleClickVisible',
            'handleClickNotVisible'
        ]);
    }
    handleChangeProperties (id, patch) {
        const {targetId, values, vm} = this.props;
        const target = vm.editingTarget;
        // VM routes postSpriteInfo to the active drag target when one exists.
        if (!values || !target || target.isStage || id !== targetId || id !== target.id ||
            (vm._dragTarget && vm._dragTarget !== target)) return;

        if ('name' in patch) {
            vm.renameSprite(id, patch.name);
        } else {
            vm.postSpriteInfo(patch);
        }
    }
    handleClickVisible (e) {
        e.preventDefault();
        this.props.onChangeVisibility(true);
    }
    handleClickNotVisible (e) {
        e.preventDefault();
        this.props.onChangeVisibility(false);
    }
    render () {
        const fallback = (
            <SpriteInfoComponent
                {...this.props}
                onClickNotVisible={this.handleClickNotVisible}
                onClickVisible={this.handleClickVisible}
            />
        );
        if (!Panel) return fallback;
        const {targetId, values, locale} = this.props;
        return (
            <Panel
                disabled={!values}
                fallback={fallback}
                locale={locale}
                targetId={values ? targetId : null}
                values={values}
                onChange={this.handleChangeProperties}
            />
        );
    }
}

SpriteInfo.propTypes = {
    ...SpriteInfoComponent.propTypes,
    locale: PropTypes.string,
    onChangeDirection: PropTypes.func,
    onChangeName: PropTypes.func,
    onChangeSize: PropTypes.func,
    onChangeVisibility: PropTypes.func,
    onChangeX: PropTypes.func,
    onChangeY: PropTypes.func,
    targetId: PropTypes.string,
    values: PropTypes.object,
    vm: PropTypes.object,
    x: PropTypes.number,
    y: PropTypes.number
};

const mapStateToProps = state => {
    const {editingTarget: targetId, sprites} = state.scratchGui.targets;
    return {
        targetId,
        values: sprites[targetId],
        vm: state.scratchGui.vm,
        locale: state.locales.locale
    };
};

export default Panel ? connect(mapStateToProps)(SpriteInfo) : SpriteInfo;
