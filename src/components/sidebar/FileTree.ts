export interface FileItem {
  name: string
  path: string
  type: 'file' | 'folder'
  size?: number
  modified?: Date
  content?: ArrayBuffer // Binary content for all files
  children?: FileItem[]
  expanded?: boolean
}

export class FileTree {
  private root: FileItem[] = []
  private selectedFile: FileItem | null = null

  constructor() {}

  // Sort items: folders first, then alphabetically
  private sortItems(items: FileItem[]): FileItem[] {
    return items.sort((a, b) => {
      // If both are the same type, sort alphabetically
      if (a.type === b.type) {
        return a.name.localeCompare(b.name)
      }
      // Folders come before files
      return a.type === 'folder' ? -1 : 1
    })
  }

  // Load files into the tree
  loadFiles(files: FileItem[]): void {
    this.root = this.sortItems(files)
  }

  // Get the entire file tree
  getTree(): FileItem[] {
    return this.root
  }

  // Find a file or folder by path
  findItemByPath(path: string): FileItem | null {
    const find = (items: FileItem[]): FileItem | null => {
      for (const item of items) {
        if (item.path === path) {
          return item
        }
        if (item.type === 'folder' && item.children) {
          const found = find(item.children)
          if (found) return found
        }
      }
      return null
    }
    return find(this.root)
  }

  // Add a new item to the tree
  addItem(item: FileItem, parentPath?: string): void {
    if (!parentPath) {
      this.root.push(item)
      this.root = this.sortItems(this.root)
      return
    }

    const parent = this.findItemByPath(parentPath)
    if (parent && parent.type === 'folder') {
      if (!parent.children) {
        parent.children = []
      }
      parent.children.push(item)
      parent.children = this.sortItems(parent.children)
    }
  }

  // Remove an item from the tree
  removeItem(path: string): boolean {
    const remove = (items: FileItem[]): boolean => {
      const index = items.findIndex(item => item.path === path)
      if (index !== -1) {
        items.splice(index, 1)
        return true
      }

      // Search in children
      for (const item of items) {
        if (item.type === 'folder' && item.children) {
          if (remove(item.children)) {
            // Re-sort children after removal
            item.children = this.sortItems(item.children)
            return true
          }
        }
      }

      return false
    }

    const result = remove(this.root)
    // Re-sort root after removal
    this.root = this.sortItems(this.root)
    return result
  }

  // Rename an item
  renameItem(oldPath: string, newName: string): boolean {
    const item = this.findItemByPath(oldPath)
    if (!item) return false

    const oldName = item.name
    item.name = newName
    item.path = item.path.replace(oldName, newName)
    
    // Update paths for children if it's a folder
    if (item.type === 'folder' && item.children) {
      const updateChildrenPaths = (children: FileItem[]) => {
        for (const child of children) {
          child.path = child.path.replace(oldName, newName)
          if (child.type === 'folder' && child.children) {
            updateChildrenPaths(child.children)
          }
        }
      }
      updateChildrenPaths(item.children)
    }
    
    // Re-sort the parent collection
    if (item.path.includes('/')) {
      // Item is in a subfolder
      const parentPath = item.path.substring(0, item.path.lastIndexOf('/'))
      const parent = this.findItemByPath(parentPath)
      if (parent && parent.children) {
        parent.children = this.sortItems(parent.children)
      }
    } else {
      // Item is in root
      this.root = this.sortItems(this.root)
    }
    
    return true
  }

  // Toggle folder expanded state
  toggleFolder(path: string): boolean {
    const item = this.findItemByPath(path)
    if (item && item.type === 'folder') {
      item.expanded = !item.expanded
      return true
    }
    return false
  }

  // Select a file
  selectFile(path: string): FileItem | null {
    const item = this.findItemByPath(path)
    if (item && item.type === 'file') {
      this.selectedFile = item
      return item
    }
    return null
  }

  // Get selected file
  getSelectedFile(): FileItem | null {
    return this.selectedFile
  }

  // Create folder structure from path
  createFolderStructure(path: string): void {
    const parts = path.split('/')
    let currentPath = ''
    
    for (let i = 0; i < parts.length; i++) {
      currentPath += (i > 0 ? '/' : '') + parts[i]
      
      // Check if folder already exists
      if (!this.findItemByPath(currentPath)) {
        const folder: FileItem = {
          name: parts[i],
          path: currentPath,
          type: 'folder',
          modified: new Date(),
          children: [],
          expanded: false
        }
        this.addItem(folder, i > 0 ? parts.slice(0, i).join('/') : undefined)
      }
    }
  }

  // Add file to specific path
  addFileToPath(file: FileItem, relativePath?: string): void {
    if (!relativePath) {
      this.root.push(file)
      this.root = this.sortItems(this.root)
      return
    }

    // Handle folder structure
    const pathParts = relativePath.split('/')
    pathParts.pop() // Remove filename

    if (pathParts.length === 0) {
      // File is in root
      this.root.push(file)
      this.root = this.sortItems(this.root)
      return
    }

    // Create folder structure if needed
    const folderPath = pathParts.join('/')
    this.createFolderStructure(folderPath)

    // Add file to the folder
    this.addItem(file, folderPath)
  }
}

// Global unique instance of FileTree
export const globalFileTree = new FileTree()