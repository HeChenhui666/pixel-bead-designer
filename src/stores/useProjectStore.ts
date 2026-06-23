import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface CellSnapshot {
  cellData: string[][]
  timestamp: number
}

export type PaletteId = 'MARD' | 'COCO' | '漫漫' | '盼盼' | '咪小窝'

export const useProjectStore = defineStore('project', () => {
  const sourceImage = ref('')
  const gridWidth = ref(32)
  const gridHeight = ref(32)
  const cellData = ref<string[][]>(createEmptyGrid(32, 32))
  const colorSummary = ref<Record<string, number>>({})
  const paletteId = ref<PaletteId>('MARD')
  const history = ref<CellSnapshot[]>([])
  const redoStack = ref<CellSnapshot[]>([])
  const isGenerating = ref(false)
  // 用户在图片页点击"生成图纸"后置 true，editor 消费后立即清除
  const pendingGenerate = ref(false)
  const selectedCell = ref<{ x: number; y: number } | null>(null)

  const hasImage = computed(() => sourceImage.value !== '')
  const canUndo = computed(() => history.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)

  function createEmptyGrid(width: number, height: number): string[][] {
    return Array.from({ length: height }, () => Array(width).fill(''))
  }

  function resetGrid() {
    cellData.value = createEmptyGrid(gridWidth.value, gridHeight.value)
    colorSummary.value = {}
    history.value = []
    redoStack.value = []
    selectedCell.value = null
  }

  function setGridSize(width: number, height: number) {
    gridWidth.value = width
    gridHeight.value = height
    resetGrid()
  }

  function pushHistory() {
    const snapshot: CellSnapshot = {
      cellData: JSON.parse(JSON.stringify(cellData.value)),
      timestamp: Date.now(),
    }
    history.value.push(snapshot)
    if (history.value.length > 20) {
      history.value.shift()
    }
    redoStack.value = []
  }

  function undo() {
    if (history.value.length === 0) return
    const currentSnapshot: CellSnapshot = {
      cellData: JSON.parse(JSON.stringify(cellData.value)),
      timestamp: Date.now(),
    }
    redoStack.value.push(currentSnapshot)
    const previous = history.value.pop()!
    cellData.value = previous.cellData
    recalcColorSummary()
  }

  function redo() {
    if (redoStack.value.length === 0) return
    const currentSnapshot: CellSnapshot = {
      cellData: JSON.parse(JSON.stringify(cellData.value)),
      timestamp: Date.now(),
    }
    history.value.push(currentSnapshot)
    const next = redoStack.value.pop()!
    cellData.value = next.cellData
    recalcColorSummary()
  }

  function updateCell(x: number, y: number, hex: string) {
    pushHistory()
    cellData.value[y][x] = hex
    recalcColorSummary()
  }

  function setCellData(data: string[][]) {
    cellData.value = data
    recalcColorSummary()
  }

  function recalcColorSummary() {
    const summary: Record<string, number> = {}
    for (const row of cellData.value) {
      for (const hex of row) {
        if (hex) {
          summary[hex] = (summary[hex] || 0) + 1
        }
      }
    }
    colorSummary.value = summary
  }

  // === 历史记录持久化 ===
  interface HistoryItem {
    id: string
    title: string
    createdAt: number
    gridWidth: number
    gridHeight: number
    paletteId: string
    cellDataSnapshot: string[][]
  }

  const MAX_HISTORY_ITEMS = 20

  function saveToHistory() {
    const now = new Date()
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const item: HistoryItem = {
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      title: `${dateStr} ${gridWidth.value}×${gridHeight.value}`,
      createdAt: Date.now(),
      gridWidth: gridWidth.value,
      gridHeight: gridHeight.value,
      paletteId: paletteId.value,
      cellDataSnapshot: JSON.parse(JSON.stringify(cellData.value)),
    }

    // 读取现有列表
    let list: HistoryItem[] = []
    try {
      const stored = uni.getStorageSync('history_list')
      if (stored) list = JSON.parse(stored)
    } catch { /* ignore */ }

    // 添加到头部
    list.unshift(item)

    // 超限清理
    while (list.length > MAX_HISTORY_ITEMS) {
      list.pop()
    }

    uni.setStorageSync('history_list', JSON.stringify(list))
  }

  function loadHistoryList(): HistoryItem[] {
    try {
      const stored = uni.getStorageSync('history_list')
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }

  function loadFromHistory(id: string): boolean {
    try {
      const list = loadHistoryList()
      const item = list.find((h) => h.id === id)
      if (!item) return false

      gridWidth.value = item.gridWidth
      gridHeight.value = item.gridHeight
      paletteId.value = item.paletteId as PaletteId
      cellData.value = JSON.parse(JSON.stringify(item.cellDataSnapshot))
      recalcColorSummary()
      sourceImage.value = '' // 历史记录不保留原图
      return true
    } catch {
      return false
    }
  }

  function deleteHistory(id: string) {
    let list = loadHistoryList()
    list = list.filter((h) => h.id !== id)
    uni.setStorageSync('history_list', JSON.stringify(list))
  }

  return {
    sourceImage,
    gridWidth,
    gridHeight,
    cellData,
    colorSummary,
    paletteId,
    history,
    redoStack,
    isGenerating,
    pendingGenerate,
    selectedCell,
    hasImage,
    canUndo,
    canRedo,
    resetGrid,
    setGridSize,
    pushHistory,
    undo,
    redo,
    updateCell,
    setCellData,
    recalcColorSummary,
    saveToHistory,
    loadHistoryList,
    loadFromHistory,
    deleteHistory,
  }
})
