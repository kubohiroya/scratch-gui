import {getHostIntegration} from '../addons/hooks.js';
import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import log from './log';
import {getIsShowingProject} from '../reducers/project-state';

const PACKAGER_URL = 'https://packager.turbowarp.org';
const PACKAGER_ORIGIN = PACKAGER_URL;
// A host that packages some projects itself, resolved once: whether it does cannot change while
// the editor is open.
const hostPackager = getHostIntegration()?.hostProjectPackager?.(getHostIntegration()?.hostIntegration?.());

const PackagerIntegrationHOC = function (WrappedComponent) {
    class PackagerIntegrationComponent extends React.Component {
        constructor (props) {
            super(props);
            this.handleClickPackager = this.handleClickPackager.bind(this);
            this.handleMessage = this.handleMessage.bind(this);
            this.projectName = () => `${this.props.reduxProjectTitle}.sb3`;
        }
        componentDidMount () {
            window.addEventListener('message', this.handleMessage);
        }
        componentWillUnmount () {
            window.removeEventListener('message', this.handleMessage);
        }
        handleClickPackager () {
            if (!this.props.canOpenPackager) return;
            const upstream = `${PACKAGER_URL}/?import_from=${location.origin}`;
            if (!hostPackager) {
                window.open(upstream);
                return;
            }
            // Reserve the browsing context during the user gesture, before serializing: a popup
            // opened after an await would be blocked. The host decides where it goes.
            const popup = window.open('about:blank');
            if (!popup) return;
            hostPackager.open({popup, vm: this.props.vm, name: this.projectName, fallbackURL: upstream});
        }
        handleMessage (e) {
            // A window the host took over talks to the host, not to this fork.
            if (hostPackager && hostPackager.handleMessage(e)) return;
            if (e.origin !== PACKAGER_ORIGIN) {
                return;
            }

            if (!this.props.canOpenPackager) {
                return;
            }

            const packagerData = e.data && e.data.p4;
            if (!packagerData || packagerData.type !== 'ready-for-import') {
                return;
            }

            // The packager needs to know that we will be importing something so it can display a loading screen
            e.source.postMessage({
                p4: {
                    type: 'start-import'
                }
            }, e.origin);

            this.props.vm.saveProjectSb3('arraybuffer')
                .then(async buffer => {
                    // Rechecked after an asynchronous import request: the Editor may have changed
                    // projects, and the host may claim this one as its own to package.
                    if (hostPackager && await hostPackager.claim({source: e.source,
                        buffer,
                        name: this.projectName,
                        cancelImport: () => e.source.postMessage({p4: {type: 'cancel-import'}}, e.origin)})) {
                        return;
                    }
                    const name = this.projectName();
                    e.source.postMessage({
                        p4: {
                            type: 'finish-import',
                            data: buffer,
                            name
                        }
                    }, e.origin, [buffer]);
                })
                .catch(err => {
                    log.error(err);
                    e.source.postMessage({
                        p4: {
                            type: 'cancel-import'
                        }
                    }, e.origin);
                });
        }
        render () {
            const {
                /* eslint-disable no-unused-vars */
                canOpenPackager,
                /* eslint-enable no-unused-vars */
                ...props
            } = this.props;
            return (
                <WrappedComponent
                    onClickPackager={this.handleClickPackager}
                    {...props}
                />
            );
        }
    }
    PackagerIntegrationComponent.propTypes = {
        canOpenPackager: PropTypes.bool,
        reduxProjectTitle: PropTypes.string,
        vm: PropTypes.shape({
            saveProjectSb3: PropTypes.func
        })
    };
    const mapStateToProps = state => ({
        canOpenPackager: getIsShowingProject(state.scratchGui.projectState.loadingState),
        reduxProjectTitle: state.scratchGui.projectTitle,
        vm: state.scratchGui.vm
    });
    const mapDispatchToProps = () => ({});
    return connect(
        mapStateToProps,
        mapDispatchToProps
    )(PackagerIntegrationComponent);
};

export {
    PackagerIntegrationHOC as default
};
