import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { getFirebaseStorage } from '../lib/firebase'

export async function uploadTrainingEvidence(
  userId: string,
  trainingId: string,
  file: File,
): Promise<string> {
  const safeName = file.name.replace(/[^\w.\-]+/g, '_')
  const path = `evidence/${userId}/${trainingId}/${Date.now()}_${safeName}`
  const r = ref(getFirebaseStorage(), path)
  await uploadBytes(r, file, { contentType: file.type || undefined })
  return getDownloadURL(r)
}
