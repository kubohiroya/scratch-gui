import React from 'react';
import PropTypes from 'prop-types';
import {connect} from 'react-redux';
import {mountDocumentEditor} from '@kubohiroya/turbowarp-document-editor';
import featureFlags from '../../config/feature-flags';
import LazyScratchBlocks from '../lib/tw-lazy-scratch-blocks';
import log from '../lib/log';

class DocumentEditor extends React.Component {
    componentDidMount () {
        this.mountEditor();
    }
    componentDidUpdate (previous) {
        if (previous.vm !== this.props.vm) {
            if (this.editor) this.editor.dispose();
            this.mountEditor();
        }
    }
    componentWillUnmount () {
        if (this.editor) this.editor.dispose();
    }
    mountEditor () {
        if (!featureFlags.embeddedYamlEditor) return;
        try {
            this.editor = mountDocumentEditor({
                vm: this.props.vm,
                document,
                language: this.props.locale,
                documentSources: featureFlags.documentSources,
                getScratch: () => ({
                    vm: this.props.vm,
                    gui: {getBlockly: () => LazyScratchBlocks.load().then(() => LazyScratchBlocks.get())}
                })
            });
        } catch (error) {
            log.error('Could not initialize the document editor.', error);
        }
    }
    render () {
        return null;
    }
}
DocumentEditor.propTypes = {vm: PropTypes.shape({}).isRequired, locale: PropTypes.string};
const mapStateToProps = state => ({vm: state.scratchGui.vm, locale: state.locales.locale});
export default connect(mapStateToProps)(DocumentEditor);
