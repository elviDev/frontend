import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface CurvedBackgroundProps {
  children: React.ReactNode;
  isDark?: boolean;
  customColor?: string;
  opacity?: number;
  style?: ViewStyle;
}

/**
 * Custom curved background component for React Native
 * Creates decorative curved shapes similar to the Flutter version
 */
export const SvgCurvedBackground: React.FC<CurvedBackgroundProps> = ({
  children,
  isDark = false,
  customColor,
  opacity = 0.3,
  style,
}) => {
  // Default colors based on theme
  const defaultColor = customColor || (isDark ? '#3933C6' : '#A05FFF'); // Indigo/Purple
  const colorWithOpacity = `${defaultColor}${Math.round(opacity * 255).toString(16).padStart(2, '0')}`;

  return (
    <View style={[styles.container, style]}>
      {/* Curved background shapes */}
      <View style={styles.backgroundContainer}>
        <Svg style={StyleSheet.absoluteFillObject} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="topGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={colorWithOpacity} />
              <Stop offset="100%" stopColor={defaultColor} stopOpacity={opacity * 0.5} />
            </LinearGradient>
            <LinearGradient id="bottomGradient" x1="0%" y1="100%" x2="100%" y2="0%">
              <Stop offset="0%" stopColor={colorWithOpacity} />
              <Stop offset="100%" stopColor={defaultColor} stopOpacity={opacity * 0.5} />
            </LinearGradient>
          </Defs>
          
          {/* Top curved shape */}
          <Path
            d="M0,0 L100,0 Q80,20 60,15 Q30,10 0,25 Z"
            fill="url(#topGradient)"
          />
          
          {/* Bottom curved shape */}
          <Path
            d="M0,100 Q20,80 40,85 Q70,90 100,75 L100,100 Z"
            fill="url(#bottomGradient)"
          />
        </Svg>
      </View>
      
      {/* Content */}
      <View style={styles.contentContainer}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  backgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  contentContainer: {
    flex: 1,
    zIndex: 1,
  },
  // Styles for SimpleCurvedBackground
  topCurve: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    height: 150,
    borderRadius: 100,
    transform: [{ scaleX: 2 }],
    zIndex: 0,
  },
  bottomCurve: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    right: -50,
    height: 150,
    borderRadius: 100,
    transform: [{ scaleX: 2 }],
    zIndex: 0,
  },
});

export { SvgCurvedBackground as CurvedBackground };
