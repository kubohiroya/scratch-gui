import {getHostIntegration} from '../addons/hooks.js';
import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import log from './log';
import {getIsShowingProject} from '../reducers/project-state';

const PACKAGER_URL = 'https://packager.turbowarp.org';
const PACKAGER_ORIGIN = PACKAGER_URL;
const connectPackager = getHostIntegration()?.hostProjectPackager;

const PackagerIntegrationHOC = function (WrappedComponent) {
    class PackagerIntegrationComponent extends React.Component {
        constructor (props) {
            super(props);
            this.handleClickPackager = this.handleClickPackager.bind(this);
            this.handleMessage = this.handleMessage.bind(this);
            this.packager = connectPackager?.(() => this.props.vm, () => this.props.reduxProjectTitle);
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
            // Reserve the window during the user gesture, before the host can serialize.
            const popup = window.open(this.packager ? 'about:blank' : upstream);
            if (popup) this.packager?.open(popup, upstream);
        }
        handleMessage (e) {
            if (this.packager?.handleMessage(e)) return;
            if (e.origin !== PACKAGER_ORIGIN) {
                return;
            }

            if (!this.props.canOpenPackager) {
                return;
            }

            if (e.data?.p4?.type !== 'ready-for-import' || !e.source) {
                return;
            }

            const cancelImport = () => e.source.postMessage({p4: {type: 'cancel-import'}}, e.origin);
            // The packager needs to know that we will be importing something so it can display a loading screen
            e.source.postMessage({
                p4: {
                    type: 'start-import'
                }
            }, e.origin);

            this.props.vm.saveProjectSb3('arraybuffer')
                .then(async buffer => {
                    if (this.packager && await this.packager.claim(e.source, buffer, cancelImport)) return;
                    const name = `${this.props.reduxProjectTitle}.sb3`;
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
                    cancelImport();
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
