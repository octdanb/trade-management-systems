/** Small NativeWind UI kit mirroring the web app's shadcn look. */
import type { ReactNode } from 'react'
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  Switch as RNSwitch,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native'

export function Button({
  title,
  variant = 'primary',
  loading = false,
  className = '',
  disabled,
  ...props
}: PressableProps & {
  title: string
  variant?: 'primary' | 'outline' | 'ghost' | 'destructive'
  loading?: boolean
  className?: string
}) {
  const base = 'flex-row items-center justify-center rounded-xl px-4 py-3 active:opacity-80'
  const variants = {
    primary: 'bg-primary',
    outline: 'border border-border bg-background',
    ghost: '',
    destructive: 'bg-red-600',
  }
  const textVariants = {
    primary: 'text-primary-foreground',
    outline: 'text-foreground',
    ghost: 'text-muted-foreground',
    destructive: 'text-white',
  }
  return (
    <Pressable
      className={`${base} ${variants[variant]} ${disabled || loading ? 'opacity-50' : ''} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <ActivityIndicator size="small" className="mr-2" />}
      <Text className={`font-semibold ${textVariants[variant]}`}>{title}</Text>
    </Pressable>
  )
}

export function Field({
  label,
  className = '',
  ...props
}: TextInputProps & { label: string; className?: string }) {
  return (
    <View className={`mb-3 ${className}`}>
      <Text className="mb-1 text-sm font-medium text-foreground">{label}</Text>
      <TextInput
        className="rounded-xl border border-border bg-background px-4 py-3 text-foreground"
        placeholderTextColor="#a3a3a3"
        {...props}
      />
    </View>
  )
}

/** Single-select chip row (mobile stand-in for the web Select). */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (value: T) => void
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => (
        <Pressable
          key={option.value}
          className={`rounded-full border px-3 py-1.5 ${
            value === option.value ? 'border-primary bg-primary' : 'border-border bg-background'
          }`}
          onPress={() => onChange(option.value)}
        >
          <Text
            className={`text-sm ${value === option.value ? 'font-semibold text-primary-foreground' : 'text-foreground'}`}
          >
            {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
  )
}

export function SwitchRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <View className="mb-3 flex-row items-center justify-between py-1">
      <Text className="text-sm font-medium text-foreground">{label}</Text>
      <RNSwitch value={value} onValueChange={onChange} />
    </View>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <View className={`rounded-2xl border border-border bg-background p-4 ${className}`}>
      {children}
    </View>
  )
}

export function Badge({
  text,
  tone = 'neutral',
}: {
  text: string
  tone?: 'neutral' | 'green' | 'red' | 'amber'
}) {
  const tones = {
    neutral: 'bg-muted text-foreground',
    green: 'bg-emerald-100 text-emerald-700',
    red: 'bg-red-100 text-red-700',
    amber: 'bg-amber-100 text-amber-700',
  }
  const [bg, textColor] = tones[tone].split(' ')
  return (
    <View className={`rounded-full px-2.5 py-0.5 ${bg}`}>
      <Text className={`text-xs font-medium ${textColor}`}>{text}</Text>
    </View>
  )
}

export function EmptyState({ text }: { text: string }) {
  return (
    <View className="items-center rounded-2xl border border-dashed border-border p-8">
      <Text className="text-center text-sm text-muted-foreground">{text}</Text>
    </View>
  )
}

export function LoadingState() {
  return (
    <View className="items-center py-10">
      <ActivityIndicator />
    </View>
  )
}
