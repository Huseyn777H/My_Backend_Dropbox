import { Authenticator } from '@aws-amplify/ui-react';
import Workspace from './components/Workspace.jsx';
import { useFiles } from './hooks/useFiles.js';

function App({ amplifyReady }) {
  const fileState = useFiles(amplifyReady);

  if (!amplifyReady) {
    return <Workspace fileState={fileState} amplifyReady={false} />;
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <Workspace fileState={fileState} signOut={signOut} user={user} amplifyReady />
      )}
    </Authenticator>
  );
}

export default App;
