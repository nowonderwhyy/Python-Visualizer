export type PrimitiveValue = {
  kind: 'primitive'
  type: string
  repr: string
}

export type ObjectReferenceValue = {
  kind: 'object_ref'
  type: string
  objectId: string
  preview: string
}

export type SerializedValue = PrimitiveValue | ObjectReferenceValue

export type SerializedObjectData =
  | {
      kind: 'list' | 'tuple' | 'set'
      items: SerializedValue[]
      truncated?: boolean
    }
  | {
      kind: 'dict'
      entries: Array<{
        key: SerializedValue
        value: SerializedValue
      }>
      truncated?: boolean
    }
  | {
      kind: 'instance'
      className: string
      attributes: Record<string, SerializedValue>
    }
  | {
      kind: 'repr'
      repr: string
    }

export type ObjectRecord = {
  objectId: string
  type: string
  preview: string
  data: SerializedObjectData
}

export type FrameSnapshot = {
  id: string
  name: string
  scopeType: 'global' | 'local'
  lineNumber: number
  variables: Record<string, SerializedValue>
}

export type ExecutionStep = {
  index: number
  event: 'line' | 'return' | 'exception'
  previousLine: number | null
  nextLine: number | null
  frames: FrameSnapshot[]
  objects: ObjectRecord[]
  stdout: string
  stdinConsumed: string[]
  details?: {
    type: string
    message: string
  }
}

export type VisualizationError = {
  type: string
  message: string
  line?: number | null
} | null

export type VisualizationResponse = {
  steps: ExecutionStep[]
  stdout: string
  error: VisualizationError
}
