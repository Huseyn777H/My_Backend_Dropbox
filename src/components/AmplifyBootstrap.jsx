import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import App from '../App.jsx';

async function configureAmplify() {
  const configModules = import.meta.glob('../aws-exports.js');
  const loadConfig = configModules['../aws-exports.js'];

  if (!loadConfig) {
    console.info('Amplify configuration not found yet. Run amplify pull or amplify push to generate src/aws-exports.js.');
    return false;
  }

  const awsExports = await loadConfig();
  Amplify.configure(awsExports.default || awsExports);
  return true;
}

function AmplifyBootstrap() {
  const [amplifyReady, setAmplifyReady] = useState(false);

  useEffect(() => {
    configureAmplify().then(setAmplifyReady);
  }, []);

  return <App amplifyReady={amplifyReady} />;
}

export default AmplifyBootstrap;
