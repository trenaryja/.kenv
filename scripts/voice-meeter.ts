import '@johnlindquist/kit'
import { Voicemeeter } from 'voicemeeter-connector'
import { Device } from 'voicemeeter-connector/dist/types/VoicemeeterTypes'

const vm = await Voicemeeter.init()
vm.connect()
vm.updateDeviceList()

const exit = () => {
  vm.disconnect()
  process.exit(0)
}

const WDM_TYPE = 3

const DEVICE_TYPES = ['input', 'output'] as const
type DeviceType = (typeof DEVICE_TYPES)[number]

const INPUT_DEVICE_NAMES = [
  'Headset (Justin Bose QC35)',
  'Microphone (Realtek(R) Audio)',
  'Microphone (Yeti Stereo Microphone)',
  'Microphone Array (PC-LM1E Audio)',
] as const
type InputDeviceName = (typeof INPUT_DEVICE_NAMES)[number]

const OUTPUT_DEVICE_NAMES = [
  'Headphones (Justin Bose QC35)',
  'Headphones (USB-C to 3.5mm-Headphone Adapter)',
  'Speakers (Yeti Stereo Microphone)',
  'Speakers (Realtek(R) Audio)',
] as const
type OutputDeviceName = (typeof OUTPUT_DEVICE_NAMES)[number]

const PRESET_NAMES = ['Yeti', 'Yeti Wireless', 'Laptop', 'Choose'] as const
type PresetName = (typeof PRESET_NAMES)[number]

const PRESET_OPTIONS: Record<PresetName, { input: InputDeviceName; output: OutputDeviceName }> = {
  Yeti: {
    input: 'Microphone (Yeti Stereo Microphone)',
    output: 'Speakers (Yeti Stereo Microphone)',
  },
  'Yeti Wireless': {
    input: 'Microphone (Yeti Stereo Microphone)',
    output: 'Headphones (Justin Bose QC35)',
  },
  Laptop: {
    input: 'Microphone (Realtek(R) Audio)',
    output: 'Speakers (Realtek(R) Audio)',
  },
  Choose: undefined,
} as const

const findDevice = (name: string) => {
  const device = [...vm.$inputDevices, ...vm.$outputDevices]
    .filter((device) => device.type === WDM_TYPE)
    .find((device) => device.name === name)
  if (!device) throw new Error(`${name} not found`)
  return device
}

const chooseDevice = async (type: DeviceType) => {
  let devices = type === 'input' ? vm.$inputDevices : vm.$outputDevices
  devices = devices.filter((device) => device.type === WDM_TYPE)
  const name = await arg({
    placeholder: `Choose ${type} device`,
    choices: devices.map((device) => device.name),
    onEscape: exit,
    onAbandon: exit,
    onBlur: exit,
  })
  return findDevice(name)
}

const setDevice = async (type: DeviceType, device: Device) => {
  const option = `${type === 'input' ? 'strip' : 'bus'}[0].device.wdm="${device.name}";`
  log(option)
  await vm.setOption(option)
  await wait(500)
}

while (true) {
  const preset = await arg<PresetName>({
    placeholder: 'Select Device Preset...',
    choices: [...PRESET_NAMES],
    onEscape: exit,
    onAbandon: exit,
    onBlur: exit,
  })
  try {
    const inputDevice = preset === 'Choose' ? await chooseDevice('input') : findDevice(PRESET_OPTIONS[preset].input)
    const outputDevice = preset === 'Choose' ? await chooseDevice('output') : findDevice(PRESET_OPTIONS[preset].output)
    await setDevice('input', inputDevice)
    await setDevice('output', outputDevice)
    exit()
  } catch (error) {
    console.error(error.message)
  }
}
