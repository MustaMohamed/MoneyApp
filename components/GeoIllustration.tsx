import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Polygon, RadialGradient, Rect, Stop } from 'react-native-svg';

export function GeoIllustration() {
  return (
    <View style={styles.wrapper}>
      <Svg width={88} height={88} viewBox="0 0 88 88">
        <Defs>
          <RadialGradient id="orb" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#C9973A" stopOpacity={0.22} />
            <Stop offset="100%" stopColor="#C9973A" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={88} height={88} fill="url(#orb)" />
        <Polygon
          points="44,16 70,62 18,62"
          fill="none"
          stroke="#C9973A"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />
        <Polygon
          points="44,28 60,56 28,56"
          fill="none"
          stroke="#D4A44C"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
        <Circle cx={44} cy={46} r={10} fill="none" stroke="#C9973A" strokeWidth={1.2} />
        <Circle cx={44} cy={46} r={2} fill="#D4A44C" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
