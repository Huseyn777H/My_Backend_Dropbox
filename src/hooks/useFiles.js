import { useCallback, useEffect, useMemo, useState } from 'react';
import { copy, downloadData, list, remove, uploadData } from 'aws-amplify/storage';

const STORAGE_PREFIX = 'private/dropbox/';

function friendlyError(error) {
  if (error?.name === 'NoCredentials') {
    return 'Connect Amplify Auth and sign in before using storage.';
  }

  return error?.message || 'Something went wrong while talking to storage.';
}

export function useFiles(enabled = true) {
  const [files, setFiles] = useState([]);
  const [versions, setVersions] = useState([]);
  const [selectedKey, setSelectedKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [versionLoading, setVersionLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const selectedFile = useMemo(() => files.find((file) => file.key === selectedKey), [files, selectedKey]);

  const notify = useCallback((text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(''), 3000);
  }, []);

  const fail = useCallback((err) => {
    setError(friendlyError(err));
    window.setTimeout(() => setError(''), 4800);
  }, []);

  const refresh = useCallback(async () => {
    if (!enabled) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await list({
        path: STORAGE_PREFIX,
        options: {
          listAll: true,
        },
      });

      const nextFiles = (result.items || [])
        .filter((item) => item.size !== undefined)
        .map((item) => ({
          key: item.path,
          name: item.path.replace(STORAGE_PREFIX, ''),
          size: item.size || 0,
          lastModified: item.lastModified,
          eTag: item.eTag,
        }))
        .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0));

      setFiles(nextFiles);
      setSelectedKey((current) => current || nextFiles[0]?.key || '');
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  }, [enabled, fail]);

  const loadVersions = useCallback(async (fileName) => {
    if (!enabled) {
      setVersions([]);
      return;
    }

    if (!fileName) {
      setVersions([]);
      return;
    }

    setVersionLoading(true);
    try {
      const result = await list({
        path: `${STORAGE_PREFIX}.versions/${fileName}/`,
        options: {
          listAll: true,
        },
      });

      setVersions(
        (result.items || [])
          .filter((item) => item.size !== undefined)
          .map((item) => ({
            key: item.path,
            name: item.path.split('/').at(-1),
            size: item.size || 0,
            lastModified: item.lastModified,
          }))
          .sort((a, b) => new Date(b.lastModified || 0) - new Date(a.lastModified || 0)),
      );
    } catch (err) {
      fail(err);
    } finally {
      setVersionLoading(false);
    }
  }, [enabled, fail]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    loadVersions(selectedFile?.name);
  }, [loadVersions, selectedFile?.name]);

  const uploadFile = useCallback(async (file) => {
    if (!enabled) {
      fail(new Error('Connect Amplify before uploading files.'));
      return;
    }

    if (!file) {
      return;
    }

    setBusy(true);
    try {
      await uploadData({
        path: `${STORAGE_PREFIX}${file.name}`,
        data: file,
        options: {
          contentType: file.type || 'application/octet-stream',
          metadata: {
            originalName: file.name,
          },
        },
      }).result;

      notify(`${file.name} uploaded`);
      await refresh();
      setSelectedKey(`${STORAGE_PREFIX}${file.name}`);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }, [enabled, fail, notify, refresh]);

  const deleteFile = useCallback(async (key) => {
    if (!enabled) {
      fail(new Error('Connect Amplify before deleting files.'));
      return;
    }

    setBusy(true);
    try {
      await remove({ path: key });
      notify('File deleted');
      setSelectedKey('');
      await refresh();
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }, [enabled, fail, notify, refresh]);

  const downloadFile = useCallback(async (key) => {
    if (!enabled) {
      fail(new Error('Connect Amplify before downloading files.'));
      return;
    }

    try {
      const result = await downloadData({ path: key }).result;
      const blob = await result.body.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = key.split('/').at(-1);
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      fail(err);
    }
  }, [enabled, fail]);

  const restoreVersion = useCallback(async (versionKey) => {
    if (!enabled) {
      fail(new Error('Connect Amplify before restoring versions.'));
      return;
    }

    if (!selectedFile) {
      return;
    }

    setBusy(true);
    try {
      await copy({
        source: {
          path: versionKey,
        },
        destination: {
          path: selectedFile.key,
        },
      });

      notify('Version restored');
      await refresh();
      await loadVersions(selectedFile.name);
    } catch (err) {
      fail(err);
    } finally {
      setBusy(false);
    }
  }, [enabled, fail, loadVersions, notify, refresh, selectedFile]);

  return {
    files,
    versions,
    selectedKey,
    selectedFile,
    loading,
    versionLoading,
    busy,
    message,
    error,
    refresh,
    selectFile: setSelectedKey,
    uploadFile,
    deleteFile,
    downloadFile,
    restoreVersion,
  };
}
