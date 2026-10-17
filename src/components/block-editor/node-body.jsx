import PropTypes from 'prop-types';
import React from 'react';

// Unmounting this body releases the view, never the aggregate's canonical draft.
class NodeBody extends React.Component {
    componentDidMount () {
        try {
            this.unmount = this.props.editor.mount(this.body);
        } catch (error) {
            this.props.onError(error);
        }
    }
    componentWillUnmount () {
        try {
            if (this.unmount) this.unmount();
        } catch (error) {
            this.props.onError(error);
        }
    }
    render () {
        return (<div
            ref={body => {
                this.body = body;
            }}
        />);
    }
}
NodeBody.propTypes = {editor: PropTypes.object.isRequired, onError: PropTypes.func.isRequired};

export default NodeBody;
