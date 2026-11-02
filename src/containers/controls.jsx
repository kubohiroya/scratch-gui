import bindAll from 'lodash.bindall';
import PropTypes from 'prop-types';
import React from 'react';
import VM from 'scratch-vm';
import {connect} from 'react-redux';

import ControlsComponent from '../components/controls/controls.jsx';
import {hostIntegration, hostStageControls} from '../lib/tw-plus-integration-points.js';

class Controls extends React.Component {
    constructor (props) {
        super(props);
        // With no host there are no extension controls, which is what a bare fork should show:
        // the controls an extension registers belong to whoever distributes this.
        this.stageControls = hostStageControls(props.vm, hostIntegration());
        this.state = this.readControls();
        bindAll(this, [
            'handleControlsChange',
            'handleGreenFlagClick',
            'handleStopAllClick'
        ]);
    }
    componentDidMount () {
        this.unsubscribeControls = this.stageControls?.subscribe(this.handleControlsChange);
        this.handleControlsChange();
    }
    componentWillUnmount () {
        this.unsubscribeControls?.();
    }
    readControls () {
        return {
            extensionControls: this.stageControls ? this.stageControls.snapshot() : [],
            // A control may have placed content to show while it is expanded. Older hosts have no
            // panel channel, so this stays null and nothing is mounted.
            extensionPanel: this.stageControls?.panel ? this.stageControls.panel() : null
        };
    }
    handleControlsChange () {
        this.setState(this.readControls());
    }
    handleGreenFlagClick (e) {
        e.preventDefault();
        // tw: implement alt+click and right click to toggle FPS
        if (e.shiftKey || e.altKey || e.type === 'contextmenu') {
            if (e.shiftKey) {
                this.props.vm.setTurboMode(!this.props.turbo);
            }
            if (e.altKey || e.type === 'contextmenu') {
                if (this.props.framerate === 30) {
                    this.props.vm.setFramerate(60);
                } else {
                    this.props.vm.setFramerate(30);
                }
            }
        } else {
            if (!this.props.isStarted) {
                this.props.vm.start();
            }
            this.props.vm.greenFlag();
        }
    }
    handleStopAllClick (e) {
        e.preventDefault();
        this.props.vm.stopAll();
    }
    render () {
        const {
            vm, // eslint-disable-line no-unused-vars
            isStarted, // eslint-disable-line no-unused-vars
            projectRunning,
            turbo,
            ...props
        } = this.props;
        return (
            <ControlsComponent
                {...props}
                active={projectRunning && isStarted}
                extensionControls={this.state.extensionControls}
                extensionPanel={this.state.extensionPanel}
                turbo={turbo}
                onGreenFlagClick={this.handleGreenFlagClick}
                onStopAllClick={this.handleStopAllClick}
            />
        );
    }
}

Controls.propTypes = {
    isStarted: PropTypes.bool.isRequired,
    projectRunning: PropTypes.bool.isRequired,
    turbo: PropTypes.bool.isRequired,
    framerate: PropTypes.number.isRequired,
    interpolation: PropTypes.bool.isRequired,
    isSmall: PropTypes.bool,
    vm: PropTypes.instanceOf(VM)
};

const mapStateToProps = state => ({
    isStarted: state.scratchGui.vmStatus.started,
    projectRunning: state.scratchGui.vmStatus.running,
    framerate: state.scratchGui.tw.framerate,
    interpolation: state.scratchGui.tw.interpolation,
    turbo: state.scratchGui.vmStatus.turbo
});
// no-op function to prevent dispatch prop being passed to component
const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(Controls);
