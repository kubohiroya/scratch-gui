import PropTypes from 'prop-types';
import React from 'react';
import {FormattedMessage} from 'react-intl';
import styles from './block-editor.css';
import NodeBody from './node-body.jsx';

let nextBodyId = 0;

class DescendantTree extends React.Component {
    constructor (props) {
        super(props);
        this.nodes = props.session.getNodes();
        this.handleIconError = this.handleIconError.bind(this);
        this.children = new Map();
        this.sections = new Map();
        this.bodyIds = new Map();
        this.toggles = new Map();
        for (const node of this.nodes) {
            const path = node.inputPath;
            const parent = path.length ? path[path.length - 1].blockId : null;
            if (!this.children.has(parent)) this.children.set(parent, []);
            this.children.get(parent).push(node);
            this.bodyIds.set(node.reference.blockId, `block-editor-node-${++nextBodyId}`);
            this.toggles.set(node.reference.blockId, this.toggle.bind(this, node.reference.blockId));
        }
        this.state = {failedIcons: new Set(),
            expanded: new Set(this.nodes.filter(node =>
                this.nodes.length <= 30 || node.inputPath.length === 0).map(node => node.reference.blockId))};
    }
    componentWillUnmount () {
        cancelAnimationFrame(this.focusFrame);
    }
    reveal (issue) {
        if (!issue || !issue.reference) return;
        const expanded = new Set(this.state.expanded);
        for (const step of issue.inputPath || []) expanded.add(step.blockId);
        expanded.add(issue.reference.blockId);
        this.setState({expanded}, () => {
            cancelAnimationFrame(this.focusFrame);
            this.focusFrame = requestAnimationFrame(() => {
                const section = this.sections.get(issue.reference.blockId);
                if (!section) return;
                const controls = [...section.querySelectorAll('input, textarea, select')];
                const path = (issue.path || '').replace(/^\./, '').replace(/\[(\d+)\]/g, '_$1')
                    .replace(/\./g, '_');
                const field = controls.find(control => path && control.id.endsWith(`_${path}`)) || controls[0];
                const target = field || section.querySelector('button');
                if (target) {
                    target.focus();
                    if (target.scrollIntoView) target.scrollIntoView({block: 'nearest'});
                }
            });
        });
    }
    toggle (id) {
        const expanded = new Set(this.state.expanded);
        if (expanded.has(id)) expanded.delete(id);
        else expanded.add(id);
        this.setState({expanded});
    }
    handleIconError (event) {
        const id = event.currentTarget.getAttribute('data-block-editor-node-icon');
        this.setState(state => ({failedIcons: new Set([...state.failedIcons, id])}));
    }
    renderNode (node) {
        const id = node.reference.blockId;
        const expanded = this.state.expanded.has(id);
        const editor = this.props.session.getEditor(id);
        const path = node.inputPath;
        const step = path.length ? path[path.length - 1] : null;
        const appearance = this.props.nodeAppearances[id] || {};
        const label = appearance.name || this.props.nodeLabels[id] || node.opcode;
        const style = {
            '--block-editor-node-colour': appearance.colour,
            '--block-editor-node-tint': appearance.tint
        };
        return (
            <section
                className={styles.treeNode}
                data-block-editor-node={id}
                key={id}
                ref={section => {
                    if (section) this.sections.set(id, section);
                    else this.sections.delete(id);
                }}
                style={style}
            >
                <h3 className={styles.nodeHeading}>
                    <button
                        aria-controls={this.bodyIds.get(id)}
                        aria-expanded={expanded}
                        data-block-editor-toggle={id}
                        disabled={this.props.disabled}
                        type="button"
                        onClick={this.toggles.get(id)}
                    >
                        <span aria-hidden="true">{expanded ? '▾ ' : '▸ '}</span>
                        {appearance.iconURI && !this.state.failedIcons.has(id) ? <img
                            alt=""
                            aria-hidden="true"
                            className={styles.nodeIcon}
                            data-block-editor-node-icon={id}
                            draggable={false}
                            src={appearance.iconURI}
                            onError={this.handleIconError}
                        /> : null}
                        <span className={styles.nodeCaption}>
                            <span data-block-editor-node-name={id}>{label}</span>
                            <span className={styles.nodeIdentity}>
                                {step ? <span className={styles.branchName}>
                                    {`${step.input} · ${step.index + 1}: `}
                                </span> : null}
                                {id}
                            </span>
                        </span>
                    </button>
                </h3>
                <div
                    hidden={!expanded}
                    id={this.bodyIds.get(id)}
                >
                    {expanded ? (
                        <React.Fragment>
                            {editor ? <NodeBody
                                editor={editor}
                                onError={this.props.onError}
                            /> : (
                                <p className={styles.structuralNode}>
                                    <FormattedMessage
                                        defaultMessage="No form for this block; its nested blocks are included."
                                        description="An intermediate structural block without an editor"
                                        id="tw.blockEditor.structuralNode"
                                    />
                                </p>
                            )}
                            {(this.children.get(id) || []).map(child => this.renderNode(child))}
                        </React.Fragment>
                    ) : null}
                </div>
            </section>
        );
    }
    render () {
        return <div className={styles.tree}>{(this.children.get(null) || []).map(node => this.renderNode(node))}</div>;
    }
}
DescendantTree.propTypes = {
    session: PropTypes.object.isRequired,
    disabled: PropTypes.bool,
    nodeAppearances: PropTypes.object,
    nodeLabels: PropTypes.object,
    onError: PropTypes.func.isRequired
};
DescendantTree.defaultProps = {nodeAppearances: {}, nodeLabels: {}, disabled: false};

export default DescendantTree;
