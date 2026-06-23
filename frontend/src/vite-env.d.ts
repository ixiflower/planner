
/// <reference types="vite/client" />

interface Window {
  showSaveFilePicker: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: FilePickerAcceptType[];
  excludeAcceptAllOption?: boolean;
  id?: string;
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
}

interface FilePickerAcceptType {
  description?: string;
  accept: Record<string, string[] | undefined>;
}

interface FileSystemFileHandle {
  createWritable: (options?: FileSystemWritableFileStreamCreateOptions) => Promise<FileSystemWritableFileStream>;
  getFile: () => Promise<File>;
  name: string;
  kind: 'file';
  isSameEntry: (other: FileSystemHandle) => Promise<boolean>;
  queryPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
  requestPermission: (descriptor?: FileSystemHandlePermissionDescriptor) => Promise<PermissionState>;
}

interface FileSystemWritableFileStream extends WritableStream {
  write: (data: BufferSource | Blob | string | WriteParams) => Promise<void>;
  seek: (position: number) => Promise<void>;
  truncate: (size: number) => Promise<void>;
}

interface WriteParams {
  type: 'write';
  position?: number;
  data: BufferSource | Blob | string;
}

interface FileSystemHandlePermissionDescriptor {
  mode?: 'read' | 'readwrite';
}

type PermissionState = 'granted' | 'denied' | 'prompt';
