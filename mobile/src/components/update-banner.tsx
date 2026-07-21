/**
 * In-app update check for Android beta builds: compares the running build's
 * versionCode against the backend's latest published APK and offers the
 * download. Hidden on iOS/Expo Go (no native build number to compare) and
 * when already up to date.
 */
import * as Application from 'expo-application'
import { Linking, Platform, Pressable, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useGetLatestAppBuild } from '../gen'
import { API_URL } from '../lib/api'

function currentVersionCode(): number | null {
  if (Platform.OS !== 'android') return null
  const code = Number(Application.nativeBuildVersion)
  return Number.isFinite(code) && code > 0 ? code : null
}

export function UpdateBanner() {
  const installed = currentVersionCode()
  const latest = useGetLatestAppBuild(
    { platform: 'android' },
    { query: { retry: false, staleTime: 3_600_000, enabled: installed !== null } },
  )

  if (installed === null || !latest.data || latest.data.version_code <= installed) {
    return null
  }

  const url = latest.data.download_url.startsWith('http')
    ? latest.data.download_url
    : `${API_URL}${latest.data.download_url}`

  return (
    <SafeAreaView edges={['top']} className="bg-emerald-600">
      <Pressable
        className="flex-row items-center justify-between bg-emerald-600 px-4 py-2.5 active:opacity-90"
        onPress={() => Linking.openURL(url)}
      >
        <View className="flex-1 pr-3">
          <Text className="text-sm font-semibold text-white">
            Update available — v{latest.data.version}
          </Text>
          <Text className="text-xs text-emerald-100">
            Tap to download and install the new version.
          </Text>
        </View>
        <Text className="text-sm font-bold text-white">Get it</Text>
      </Pressable>
    </SafeAreaView>
  )
}
