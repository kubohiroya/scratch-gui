import {extensionProjectArchiveOptions} from '../config/extension-project-limits.js';
import React from 'react';
import {isExtensionLoaderEnabled} from '../config/extension-loader-flag.js';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import log from './log';
import {getIsShowingProject} from '../reducers/project-state';
import JSZip from '@turbowarp/jszip';
import {createProjectIO} from '@kubohiroya/turbowarp-extension-loader/project-codec';

const PACKAGER_URL = 'https://packager.turbowarp.org';
const PACKAGER_ORIGIN = PACKAGER_URL;

const PackagerIntegrationHOC = function (WrappedComponent) {
    class PackagerIntegrationComponent extends React.Component {
        constructor (props) {
            super(props);
            this.handleClickPackager = this.handleClickPackager.bind(this);
            this.handleMessage = this.handleMessage.bind(this);
            this.plusLoaderEnabled = isExtensionLoaderEnabled(location.search);
            this.plusPackagerWindow = null;
            this.plusPackagerBuffer = null;
        }
        componentDidMount () {
            window.addEventListener('message', this.handleMessage);
        }
        componentWillUnmount () {
            window.removeEventListener('message', this.handleMessage);
        }
        handleClickPackager () {
            if (!this.props.canOpenPackager) return;
            if (!this.plusLoaderEnabled) {
                window.open(`${PACKAGER_URL}/?import_from=${location.origin}`);
                return;
            }
            // Reserve the browsing context during the user gesture, before serializing.
            const popup = window.open('about:blank');
            if (!popup) return;
            this.props.vm.saveProjectSb3('arraybuffer').then(async buffer => {
                const {manifest} = await createProjectIO({zip: JSZip, ...extensionProjectArchiveOptions}).prepare(buffer);
                if (popup.closed) return;
                if (manifest === null) {
                    popup.location.href = `${PACKAGER_URL}/?import_from=${location.origin}`;
                    return;
                }
                this.plusPackagerWindow = popup;
                this.plusPackagerBuffer = buffer;
                popup.location.href = new URL(`${process.env.ROOT || './'}plus-packager.html`, location.href).href;
            }).catch(error => {
                popup.close();
                log.error(error);
                window.alert(`Plus HTML出力を開始できませんでした: ${error.message}`);
            });
        }
        handleMessage (e) {
            const plusData = e.data && e.data.twPlusPackage;
            if (e.origin === location.origin && e.source === this.plusPackagerWindow &&
                plusData && plusData.type === 'ready' && this.plusPackagerBuffer) {
                const buffer = this.plusPackagerBuffer;
                this.plusPackagerBuffer = null;
                e.source.postMessage({twPlusPackage: {type: 'project', bytes: buffer,
                    name: `${this.props.reduxProjectTitle}.sb3`}}, location.origin, [buffer]);
                return;
            }
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
                    // Recheck after an asynchronous import request: the Editor may have changed projects.
                    if (this.plusLoaderEnabled) {
                        const {manifest} = await createProjectIO({zip: JSZip, ...extensionProjectArchiveOptions}).prepare(buffer);
                        if (manifest !== null) {
                            e.source.postMessage({p4: {type: 'cancel-import'}}, e.origin);
                            this.plusPackagerWindow = e.source;
                            this.plusPackagerBuffer = buffer;
                            e.source.location.href = new URL(`${process.env.ROOT || './'}plus-packager.html`, location.href).href;
                            return;
                        }
                    }
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
