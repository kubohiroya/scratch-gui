import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import {connect} from 'react-redux';

import {getHostIntegration} from '../addons/hooks';
import SpriteInfoComponent from '../components/sprite-info/sprite-info.jsx';

const wrapSpriteInfo = getHostIntegration()?.wrapSpriteInfo;
export const hasHostSpriteProperties = Boolean(wrapSpriteInfo);

class SpriteInfo extends React.Component {
    constructor (props) {
        super(props);
        bindAll(this, [
            'handleClickVisible',
            'handleClickNotVisible'
        ]);
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
        return (
            <SpriteInfoComponent
                {...this.props}
                onClickNotVisible={this.handleClickNotVisible}
                onClickVisible={this.handleClickVisible}
            />
        );
    }
}

SpriteInfo.propTypes = {
    ...SpriteInfoComponent.propTypes,
    onChangeDirection: PropTypes.func,
    onChangeName: PropTypes.func,
    onChangeSize: PropTypes.func,
    onChangeVisibility: PropTypes.func,
    onChangeX: PropTypes.func,
    onChangeY: PropTypes.func,
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

export default wrapSpriteInfo ? connect(mapStateToProps)(wrapSpriteInfo(SpriteInfo)) : SpriteInfo;
