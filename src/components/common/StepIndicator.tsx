import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../utils/colors';

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  titles?: string[];
}

export const StepIndicator: React.FC<StepIndicatorProps> = ({
  totalSteps,
  currentStep,
  titles,
}) => {
  return (
    <View style={{ paddingHorizontal: 24, paddingVertical: 20 }}>
      {/* Progress Bar */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
      }}>
        {Array.from({ length: totalSteps }, (_, index) => (
          <React.Fragment key={index}>
            {/* Step Circle */}
            <View style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: index + 1 <= currentStep ? Colors.primary : Colors.gray[200],
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 2,
              borderColor: index + 1 === currentStep ? Colors.primary : 
                          index + 1 < currentStep ? Colors.primary : Colors.gray[300]
            }}>
              {index + 1 < currentStep ? (
                <Text style={{
                  color: Colors.white,
                  fontSize: 16,
                  fontWeight: 'bold'
                }}>✓</Text>
              ) : (
                <Text style={{
                  color: index + 1 <= currentStep ? Colors.white : Colors.gray[500],
                  fontSize: 14,
                  fontWeight: 'bold'
                }}>
                  {index + 1}
                </Text>
              )}
            </View>
            
            {/* Connector Line */}
            {index < totalSteps - 1 && (
              <View style={{
                flex: 1,
                height: 2,
                backgroundColor: index + 1 < currentStep ? Colors.primary : Colors.gray[300],
                marginHorizontal: 8
              }} />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Step Title */}
      {titles && titles[currentStep - 1] && (
        <Text style={{
          fontSize: 16,
          fontWeight: '600',
          color: Colors.text.primary,
          textAlign: 'center',
          marginBottom: 4
        }}>
          {titles[currentStep - 1]}
        </Text>
      )}
      
      {/* Step Counter */}
      <Text style={{
        fontSize: 14,
        color: Colors.text.secondary,
        textAlign: 'center'
      }}>
        Step {currentStep} of {totalSteps}
      </Text>
    </View>
  );
};