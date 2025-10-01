import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  StyleSheet,
  Platform,
  StatusBar,
} from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutDown,
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler } from 'react-native-gesture-handler';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';
import IonIcon from 'react-native-vector-icons/Ionicons';

const { height: screenHeight } = Dimensions.get('window');

// Constants for better maintainability
const CONSTANTS = {
  GESTURE_DISMISS_THRESHOLD: 100,
  GESTURE_VELOCITY_THRESHOLD: 500,
  ANIMATION_DISTANCE: 300,
  OPACITY_REDUCTION_FACTOR: 200,
  MIN_OPACITY: 0.3,
  MAX_SHEET_HEIGHT: 0.7,
  HANDLE_WIDTH: 48,
  HANDLE_HEIGHT: 5,
  BORDER_RADIUS: 28,
  OPTION_BORDER_RADIUS: 16,
  ICON_SIZE: 20,
  ICON_CONTAINER_SIZE: 40,
};

interface GestureContext {
  startY: number;
}

interface ActionSheetOption {
  text: string;
  onPress: () => void;
  style?: 'default' | 'destructive' | 'cancel';
  icon?: string;
  iconLibrary?: 'material' | 'ionicon';
}

interface ActionSheetProps {
  visible: boolean;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  onClose: () => void;
}

export const ActionSheet: React.FC<ActionSheetProps> = ({
  visible,
  title,
  message,
  options,
  onClose,
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(1);
  const backdropOpacity = useSharedValue(0);

  // Reset values when the ActionSheet becomes visible
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      opacity.value = 1;
      backdropOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
    }
  }, [visible]);

  const handleClose = useCallback(() => {
    // Prevent multiple calls
    if (!visible) return;
    onClose();
  }, [visible, onClose]);

  const handleOptionPress = useCallback(
    (option: ActionSheetOption) => {
      // Close first for immediate visual feedback
      handleClose();
      // Execute action after a small delay to allow animation to start
      setTimeout(() => {
        option.onPress();
      }, 100);
    },
    [handleClose],
  );

  const gestureHandler = useAnimatedGestureHandler<any, GestureContext>({
    onStart: (_, context) => {
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      // Only allow downward movement
      const newTranslateY = context.startY + event.translationY;
      if (newTranslateY >= 0) {
        translateY.value = newTranslateY;
        // Reduce opacity as user swipes down
        const opacityValue = Math.max(
          CONSTANTS.MIN_OPACITY,
          1 - newTranslateY / CONSTANTS.OPACITY_REDUCTION_FACTOR,
        );
        opacity.value = opacityValue;
        backdropOpacity.value = opacityValue;
      }
    },
    onEnd: event => {
      const shouldDismiss =
        event.translationY > CONSTANTS.GESTURE_DISMISS_THRESHOLD ||
        event.velocityY > CONSTANTS.GESTURE_VELOCITY_THRESHOLD;

      if (shouldDismiss) {
        // Animate out and close
        translateY.value = withSpring(CONSTANTS.ANIMATION_DISTANCE, {
          damping: 20,
          stiffness: 300,
        });
        opacity.value = withSpring(0, { damping: 20, stiffness: 300 });
        backdropOpacity.value = withSpring(0, { damping: 20, stiffness: 300 });
        runOnJS(handleClose)();
      } else {
        // Snap back to original position
        translateY.value = withSpring(0, { damping: 20, stiffness: 300 });
        opacity.value = withSpring(1, { damping: 20, stiffness: 300 });
        backdropOpacity.value = withSpring(1, { damping: 20, stiffness: 300 });
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateY: translateY.value }],
      opacity: opacity.value,
    };
  });

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const getIconComponent = (option: ActionSheetOption) => {
    if (!option.icon) return null;

    const iconColor =
      option.style === 'destructive'
        ? '#EF4444'
        : option.style === 'cancel'
          ? '#6B7280'
          : '#374151';

    if (option.iconLibrary === 'ionicon') {
      return (
        <IonIcon
          name={option.icon}
          size={CONSTANTS.ICON_SIZE}
          color={iconColor}
        />
      );
    }
    return (
      <MaterialIcon
        name={option.icon}
        size={CONSTANTS.ICON_SIZE}
        color={iconColor}
      />
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop */}
      <Animated.View
        entering={FadeIn.duration(300)}
        exiting={FadeOut.duration(200)}
        style={[styles.backdrop, backdropAnimatedStyle]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* Action Sheet */}
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          entering={SlideInUp.duration(400)
            .springify()
            .damping(12)
            .stiffness(100)}
          exiting={SlideOutDown.duration(250)}
          style={[styles.sheet, animatedStyle]}
        >
          {/* Draggable Handle bar */}
          <TouchableOpacity
            onPress={handleClose}
            style={styles.handleContainer}
            activeOpacity={0.7}
          >
            <View style={styles.handle} />
          </TouchableOpacity>

          {/* Header */}
          {(title || message) && (
            <View style={styles.headerContainer}>
              {title && <Text style={styles.title}>{title}</Text>}
              {message && <Text style={styles.message}>{message}</Text>}
            </View>
          )}

          {/* Options */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollViewContent}
          >
            <View style={styles.optionsContainer}>
              {options.map((option, index) => {
                const isCancel = option.style === 'cancel';
                const isDestructive = option.style === 'destructive';
                const isLastOption = index === options.length - 1;

                return (
                  <TouchableOpacity
                    key={`${option.text}-${index}`}
                    onPress={() => handleOptionPress(option)}
                    style={[
                      styles.optionButton,
                      isCancel && styles.cancelButton,
                      !isCancel && !isLastOption && styles.optionBorder,
                    ]}
                    activeOpacity={0.7}
                  >
                    {option.icon && (
                      <View
                        style={[
                          styles.iconContainer,
                          isDestructive && styles.destructiveIconContainer,
                          isCancel && styles.cancelIconContainer,
                        ]}
                      >
                        {getIconComponent(option)}
                      </View>
                    )}

                    <View style={styles.textContainer}>
                      <Text
                        style={[
                          styles.optionText,
                          isDestructive && styles.destructiveText,
                          isCancel && styles.cancelText,
                        ]}
                      >
                        {option.text}
                      </Text>
                      {isDestructive && (
                        <Text style={styles.destructiveSubtext}>
                          This action cannot be undone
                        </Text>
                      )}
                    </View>

                    {!isCancel && (
                      <MaterialIcon
                        name="chevron-right"
                        size={CONSTANTS.ICON_SIZE}
                        color="#CBD5E1"
                      />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: CONSTANTS.BORDER_RADIUS,
    borderTopRightRadius: CONSTANTS.BORDER_RADIUS,
    paddingBottom: Platform.select({
      ios: 34,
      android: 20,
      default: 20,
    }),
    maxHeight: screenHeight * CONSTANTS.MAX_SHEET_HEIGHT,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#F1F5F9',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  handle: {
    width: CONSTANTS.HANDLE_WIDTH,
    height: CONSTANTS.HANDLE_HEIGHT,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
  },
  headerContainer: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollViewContent: {
    paddingBottom: 16,
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 6,
    borderRadius: CONSTANTS.OPTION_BORDER_RADIUS,
    backgroundColor: '#FFFFFF',
  },
  cancelButton: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 8,
    marginBottom: 12,
  },
  optionBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#F1F5F9',
  },
  iconContainer: {
    width: CONSTANTS.ICON_CONTAINER_SIZE,
    height: CONSTANTS.ICON_CONTAINER_SIZE,
    borderRadius: CONSTANTS.ICON_CONTAINER_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    backgroundColor: '#F8FAFC',
  },
  destructiveIconContainer: {
    backgroundColor: '#FEF2F2',
  },
  cancelIconContainer: {
    backgroundColor: '#F1F5F9',
  },
  textContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  destructiveText: {
    color: '#DC2626',
    marginBottom: 2,
  },
  cancelText: {
    color: '#64748B',
  },
  destructiveSubtext: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '400',
  },
});
