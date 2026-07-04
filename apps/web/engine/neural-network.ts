export const INPUT_COUNT = 14
export const HIDDEN_COUNT = 8
export const OUTPUT_COUNT = 4

export const INPUT_LABELS = [
  "Cone Signal",
  "Cone Angle",
  "Hazard Distance",
  "Hazard Angle",
  "Energy",
  "Speed",
  "Threat/Prey Distance",
  "Threat/Prey Angle",
  "Locked On",
  "Chase Duration",
  "Scent Signal",
  "Scent Angle",
  "Hearing Signal",
  "Hearing Angle",
] as const

export const OUTPUT_LABELS = [
  "Steer",
  "Throttle",
  "Eat",
  "Rest",
] as const

export const WEIGHT_COUNT =
  INPUT_COUNT * HIDDEN_COUNT +
  HIDDEN_COUNT +
  HIDDEN_COUNT * OUTPUT_COUNT +
  OUTPUT_COUNT

function sigmoid(value: number): number {
  return 1 / (1 + Math.exp(-value))
}

export class NeuralNetwork {
  readonly weights: Float32Array
  readonly hidden: Float32Array
  readonly outputs: Float32Array
  readonly inputs: Float32Array

  constructor(weights?: Float32Array) {
    this.weights =
      weights && weights.length === WEIGHT_COUNT
        ? new Float32Array(weights)
        : NeuralNetwork.createRandomWeights()
    this.hidden = new Float32Array(HIDDEN_COUNT)
    this.outputs = new Float32Array(OUTPUT_COUNT)
    this.inputs = new Float32Array(INPUT_COUNT)
  }

  static createRandomWeights(): Float32Array {
    const weights = new Float32Array(WEIGHT_COUNT)
    for (let i = 0; i < weights.length; i++) {
      weights[i] = (Math.random() * 2 - 1) * 0.5
    }
    return weights
  }

  clone(): NeuralNetwork {
    return new NeuralNetwork(this.weights)
  }

  forward(input: Float32Array): Float32Array {
    for (let i = 0; i < INPUT_COUNT; i++) {
      this.inputs[i] = input[i] ?? 0
    }

    let offset = 0

    for (let h = 0; h < HIDDEN_COUNT; h++) {
      let sum = 0
      for (let i = 0; i < INPUT_COUNT; i++) {
        sum += this.inputs[i]! * this.weights[offset + i * HIDDEN_COUNT + h]!
      }
      sum += this.weights[offset + INPUT_COUNT * HIDDEN_COUNT + h]!
      this.hidden[h] = sigmoid(sum)
    }

    offset = INPUT_COUNT * HIDDEN_COUNT + HIDDEN_COUNT

    for (let o = 0; o < OUTPUT_COUNT; o++) {
      let sum = 0
      for (let h = 0; h < HIDDEN_COUNT; h++) {
        sum += this.hidden[h]! * this.weights[offset + h * OUTPUT_COUNT + o]!
      }
      sum += this.weights[offset + HIDDEN_COUNT * OUTPUT_COUNT + o]!
      this.outputs[o] = sigmoid(sum)
    }

    return this.outputs
  }
}
