import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Animated, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS } from '../../theme/colors';

const { width } = Dimensions.get('window');

const questions = [
    {
        text: "When entering a room, what catches your eye first?",
        options: [
            { text: "Clean lines, negative space, texture quality", score: { aesthetic: 0 } },
            { text: "Bold colors, unique art, statement pieces", score: { aesthetic: 10 } },
            { text: "Books, plants, personal memorabilia", score: { aesthetic: 5 } },
            { text: "Tech gadgets, ergonomic design", score: { aesthetic: 3 } }
        ]
    },
    {
        text: "Your ideal Instagram feed aesthetic is:",
        options: [
            { text: "Monochrome, consistent, grid harmony", score: { pattern: 0 } },
            { text: "Eclectic, vibrant, mix of memes and art", score: { pattern: 10 } },
            { text: "Vintage filters, film grain, nostalgic", score: { pattern: 7 } },
            { text: "Clean product shots, educational", score: { pattern: 2 } }
        ]
    },
    {
        text: "In unfamiliar social situations, you feel confident wearing:",
        options: [
            { text: "Tailored blazer, structured pieces", score: { comfort: 0 } },
            { text: "Soft fabrics, layers, comfortable shoes", score: { comfort: 10 } },
            { text: "Conversation starters, unique accessories", score: { comfort: 5 } },
            { text: "Neutral basics that blend in", score: { comfort: 8 } }
        ]
    },
    {
        text: "Getting dressed, your primary goal is:",
        options: [
            { text: "Efficiency—grab and go", score: { risk: 0 } },
            { text: "Creative expression", score: { risk: 10 } },
            { text: "Appropriate impression", score: { risk: 3 } },
            { text: "Physical comfort", score: { risk: 5 } }
        ]
    },
    {
        text: "Your closet organization style:",
        options: [
            { text: "Strict work/play/gym separation", score: { flexibility: 0 } },
            { text: "Everything mixed, versatile pieces", score: { flexibility: 10 } },
            { text: "Seasonal rotation, capsule approach", score: { flexibility: 5 } },
            { text: "Occasion-based boxes", score: { flexibility: 3 } }
        ]
    }
];

export default function VibeSyncQuizScreen({ navigation }) {
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [userScores, setUserScores] = useState({
        aesthetic: 0,
        comfort: 0,
        pattern: 0,
        risk: 0,
        flexibility: 0
    });

    const progressAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: ((currentQuestion) / questions.length) * 100,
            duration: 500,
            useNativeDriver: false,
        }).start();
    }, [currentQuestion]);

    const handleSelectAnswer = (idx) => {
        const scores = questions[currentQuestion].options[idx].score;
        const newScores = { ...userScores };

        Object.keys(scores).forEach(key => {
            newScores[key] = (newScores[key] || 0) + scores[key];
        });

        setUserScores(newScores);

        if (currentQuestion < questions.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        } else {
            // Fill the bar to 100% just before navigating
            Animated.timing(progressAnim, {
                toValue: 100,
                duration: 300,
                useNativeDriver: false,
            }).start(() => {
                navigation.navigate('VibeSyncResults', { finalScores: newScores });
            });
        }
    };

    const q = questions[currentQuestion];

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#f5f7fa', '#c3cfe2']}
                style={StyleSheet.absoluteFill}
            />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.quizContainer}>
                    <View style={styles.progressBarBg}>
                        <Animated.View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: progressAnim.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    })
                                }
                            ]}
                        >
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={{ flex: 1 }}
                            />
                        </Animated.View>
                    </View>

                    <Text style={styles.questionText}>{q.text}</Text>

                    <View style={styles.options}>
                        {q.options.map((opt, idx) => (
                            <TouchableOpacity
                                key={idx}
                                style={styles.option}
                                onPress={() => handleSelectAnswer(idx)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionLetter}>
                                    <Text style={styles.optionLetterText}>{String.fromCharCode(65 + idx)}</Text>
                                </View>
                                <Text style={styles.optionText}>{opt.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    quizContainer: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 520,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 30,
        elevation: 10,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#eee',
        borderRadius: 3,
        marginBottom: 25,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    questionText: {
        fontSize: 19,
        fontWeight: '700',
        color: '#1F2937',
        marginBottom: 22,
        lineHeight: 28,
    },
    options: {
        gap: 12,
    },
    option: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        padding: 16,
        borderRadius: 14,
    },
    optionLetter: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#667eea',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    optionLetterText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    optionText: {
        flex: 1,
        fontSize: 15,
        color: '#1F2937',
        lineHeight: 22,
    },
});
