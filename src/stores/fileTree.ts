import { defineStore } from 'pinia'
import { ref } from 'vue'
import { unzipSync } from 'fflate'
import { writeFilesToMuJoCoFS } from '@/mujoco_wasm/MujocoInstance'

export interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modified?: Date
  content?: ArrayBuffer
  children?: FileItem[]
  expanded?: boolean
}

export const useFileTreeStore = defineStore('fileTree', () => {
  const root = ref<FileItem[]>([])
  const selectedFile = ref<FileItem | null>(null)

  const sortItems = (items: FileItem[]): FileItem[] => {
    return items.sort((a, b) => {
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      return a.type === 'folder' ? -1 : 1
    })
  }

  const findItemByPath = (path: string): FileItem | null => {
    const find = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.path === path) return item
        if (item.type === 'folder' && item.children) {
          const found = find(item.children)
          if (found) return found
        }
      }
      return null
    }
    return find(root.value)
  }

  const createFolderStructure = (path: string): void => {
    const parts = path.split('/')
    let currentPath = ''
    let parentFolder = root.value

    for (let i = 0; i < parts.length; i++) {
      currentPath += (i > 0 ? '/' : '') + parts[i]
      let currentFile = findItemByPath(currentPath)
      
      if (!currentFile) {
        const folder: FileItem = {
          name: parts[i],
          path: currentPath,
          type: 'folder',
          modified: new Date(),
          children: [],
          expanded: false
        }
        parentFolder.push(folder)
        parentFolder = sortItems(parentFolder)
        parentFolder = folder.children!
      } else {
        parentFolder = currentFile.children!
      }
    }
  }

  const addItem = (item: FileItem): void => {
    if (findItemByPath(item.path)) return

    const parentPath = item.path.substring(0, item.path.lastIndexOf('/'))
    if (!parentPath) {
      root.value.push(item)
      root.value = sortItems(root.value)
      return
    }

    const parent = findItemByPath(parentPath)
    if (!parent) {
      createFolderStructure(parentPath)
    }

    const parentFolder = findItemByPath(parentPath)
    if (parentFolder && parentFolder.type === 'folder') {
      if (!parentFolder.children) parentFolder.children = []
      parentFolder.children.push(item)
      parentFolder.children = sortItems(parentFolder.children)
    }
  }

  const toggleFolder = (path: string): void => {
    const item = findItemByPath(path)
    if (item && item.type === 'folder') {
      item.expanded = !item.expanded
    }
  }

  const selectFile = (path: string): void => {
    const item = findItemByPath(path)
    if (item && item.type === 'file') {
      selectedFile.value = item
    }
  }

  const getFlatFileList = (): FileItem[] => {
    const files: FileItem[] = []
    const traverse = (items: FileItem[]) => {
      for (const item of items) {
        if (item.type === 'file') {
          files.push(item)
        } else if (item.type === 'folder' && item.children) {
          traverse(item.children)
        }
      }
    }
    traverse(root.value)
    return files
  }

  const AddRobot = (buffer: ArrayBuffer): void => {
    const decompressed = unzipSync(new Uint8Array(buffer))
    
    for (const [path, data] of Object.entries(decompressed)) {
      if (data.byteLength) {
        const name = path.split('/').pop() || 'unknown'
        const newFile: FileItem = {
          name,
          path,
          type: 'file',
          size: data.byteLength,
          modified: new Date(),
          content: data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength),
        }
        addItem(newFile)
      }
    }
    
    // Sync to MuJoCo FS
    writeFilesToMuJoCoFS(root.value)
  }

  const loadDefaultRobot = async (): Promise<void> => {
    try {
      const response = await fetch('/SO101.robot.zip')
      if (response.ok) {
        const buffer = await response.arrayBuffer()
        AddRobot(buffer)
      }
    } catch (error) {
      console.warn('Failed to load default robot:', error)
    }
  }

  // Load default robot asynchronously without blocking store creation
  setTimeout(() => loadDefaultRobot(), 0)

  return {
    root,
    selectedFile,
    addItem,
    toggleFolder,
    selectFile,
    getFlatFileList,
    findItemByPath,
    AddRobot,
    loadDefaultRobot
  }
})
