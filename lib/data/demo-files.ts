// Original demo uploads are stored as Blobs in IndexedDB, not in analytics or localStorage.
function database(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('affiliateos-files', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('imports');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(Error('Browser file storage is unavailable.'));
  });
}
export async function preserveDemoFile(id: string, file: File) {
  const db = await database();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('imports', 'readwrite');
    tx.objectStore('imports').put(file, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(Error('Could not preserve the uploaded file.'));
  });
  db.close();
}
export async function readDemoFile(id: string): Promise<Blob | undefined> {
  const db = await database();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const request = db.transaction('imports').objectStore('imports').get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(Error('Could not retrieve the original file.'));
  });
  db.close();
  return file;
}
