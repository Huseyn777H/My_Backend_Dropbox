import FileList from './FileList.jsx';
import FileUploader from './FileUploader.jsx';
import VersionTimeline from './VersionTimeline.jsx';
import './Workspace.css';

function Workspace({ fileState, signOut, user, amplifyReady }) {
  const accountLabel = amplifyReady
    ? user?.signInDetails?.loginId || user?.username || 'Signed in'
    : 'Backend not connected';

  return (
    <main className="appShell">
      <header className="appHeader">
        <div className="brandBlock">
          <div>
            <h1>Serverless Dropbox</h1>
            <p className="eyebrow">React + Amplify + S3</p>
          </div>
        </div>
        <div className="accountTools">
          <span className="signedIn">
            {accountLabel}
          </span>
          <button className="iconButton" type="button" onClick={fileState.refresh} aria-label="Refresh files" title="Refresh files">
            Refresh
          </button>
          {signOut && (
            <button className="textButton" type="button" onClick={signOut}>
              Sign out
            </button>
          )}
        </div>
      </header>

      <section className="workspaceGrid">
        <FileUploader onUpload={fileState.uploadFile} busy={fileState.busy} />
        <FileList
          files={fileState.files}
          selectedKey={fileState.selectedKey}
          onSelect={fileState.selectFile}
          onDelete={fileState.deleteFile}
          onDownload={fileState.downloadFile}
          busy={fileState.busy}
          loading={fileState.loading}
        />
        <VersionTimeline
          versions={fileState.versions}
          selectedFile={fileState.selectedFile}
          onRestore={fileState.restoreVersion}
          loading={fileState.versionLoading}
        />
      </section>

      {!amplifyReady && (
        <p className="setupNotice">AWS is not connected yet. Run amplify push or amplify pull to create src/aws-exports.js.</p>
      )}
      {fileState.message && <p className="toastMessage">{fileState.message}</p>}
      {fileState.error && <p className="errorMessage">{fileState.error}</p>}
    </main>
  );
}

export default Workspace;
