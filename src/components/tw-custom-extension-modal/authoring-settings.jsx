import React from 'react';
import PropTypes from 'prop-types';
import Modal from '../../containers/modal.jsx';
import styles from './custom-extension-modal.css';

const AuthoringSettings = props => {
    const text = (ja, en) => (props.locale.startsWith('ja') ? ja : en);
    return (
        <Modal
            className={styles.authoringModal}
            headerClassName={styles.authoringHeader}
            contentLabel={text('カスタム拡張を追加', 'Add Custom Extension')}
            id="customExtensionModal"
            onRequestClose={props.onClose}
        >
            <form
                className={styles.authoringForm}
                onSubmit={props.onSubmit}
                data-testid="tw-plus-authoring"
            >
                <div className={styles.settingsBody}>
                    <p>{text('追加する機能拡張の保存方法と実行方法を選択してください。',
                        'Choose how to save and run the extensions.')}</p>
                    {props.sources.map((source, index) => (
                        <label
                            className={styles.settingField}
                            key={`${index}-${source.name}`}
                        >
                            <span>{text('拡張ID', 'Extension ID')}{' — '}{source.name}</span>
                            <input
                                required
                                autoComplete="off"
                                pattern="[a-zA-Z0-9]+"
                                placeholder="myextension"
                                value={props.ids[index] || ''}
                                disabled={props.busy}
                                data-testid="tw-plus-authoring-id"
                                data-source-index={index}
                                onChange={props.onChangeId}
                            />
                        </label>
                    ))}
                    <p className={styles.hint}>{text('JSのgetInfo().idと同じ値を入力してください。',
                        'Enter the value of getInfo().id in the JavaScript.')}</p>
                    <label className={styles.settingField}>
                        <span>{text('作品への保存方法', 'Save in the project')}</span>
                        <select
                            value={props.distribution}
                            disabled={props.busy || props.type !== 'url'}
                            onChange={props.onChangeDistribution}
                            data-testid="tw-plus-authoring-mode"
                        >
                            <option value="embedded">{
                                text('JSを作品に同梱（Embedded）', 'Include JavaScript (Embedded)')
                            }</option>
                            {props.type === 'url' && <option value="remote">{
                                text('読み込み元のURLを保存（Remote）', 'Save the source URL (Remote)')
                            }</option>}
                        </select>
                    </label>
                    <label className={styles.settingField}>
                        <span>{text('実行方法', 'Execution')}</span>
                        <select
                            value={props.execution}
                            disabled={props.busy}
                            onChange={props.onChangeExecution}
                            data-testid="tw-plus-authoring-execution"
                        >
                            <option value="sandboxed">{text('サンドボックスあり', 'With sandbox')}</option>
                            <option value="unsandboxed">{text('サンドボックスなし', 'Without sandbox')}</option>
                        </select>
                    </label>
                    <p
                        role="status"
                        data-testid="tw-plus-authoring-status"
                        className={styles.status}
                    >{props.status}</p>
                    {props.recoveryURL && <a
                        href={props.recoveryURL}
                        download="project-before-extension.sb3"
                    >{
                            text('追加前の作品を保存', 'Save the project before addition')
                        }</a>}
                </div>
                <div className={styles.authoringFooter}>
                    <button
                        type="button"
                        disabled={props.busy}
                        onClick={props.onBack}
                    >{text('戻る', 'Back')}</button>
                    <button
                        type="submit"
                        disabled={props.busy}
                        className={styles.loadButton}
                        data-testid="tw-plus-authoring-submit"
                    >
                        {text('検証して追加', 'Verify and add')}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
AuthoringSettings.propTypes = {
    locale: PropTypes.string.isRequired,
    sources: PropTypes.arrayOf(PropTypes.shape({name: PropTypes.string})).isRequired,
    ids: PropTypes.arrayOf(PropTypes.string).isRequired,
    type: PropTypes.string.isRequired,
    distribution: PropTypes.string.isRequired,
    execution: PropTypes.string.isRequired,
    busy: PropTypes.bool.isRequired,
    status: PropTypes.string,
    recoveryURL: PropTypes.string,
    onClose: PropTypes.func.isRequired,
    onBack: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired,
    onChangeId: PropTypes.func.isRequired,
    onChangeDistribution: PropTypes.func.isRequired,
    onChangeExecution: PropTypes.func.isRequired
};
export default AuthoringSettings;
