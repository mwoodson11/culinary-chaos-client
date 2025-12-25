import { Box, Typography, Button, Paper, Alert, useTheme } from '@mui/material'
import { useState, useEffect, useRef } from 'react'

interface TriviaQuestion {
  question: string
  choices: string[]
  correctAnswer: number
  points: number
}

interface TriviaGameProps {
  onComplete: (points: number, difficulty: number) => void
  difficulty: number // 50, 100, or 200
}

// Generate a trivia question based on difficulty
const generateTriviaQuestion = (difficulty: number): TriviaQuestion => {
  // Simple trivia questions - in a real app, you'd use an API or larger database
  const questionSets = {
    50: [
      { q: "What is the capital of France?", choices: ["London", "Berlin", "Paris"], correct: 2 },
      { q: "How many continents are there?", choices: ["5", "6", "7"], correct: 2 },
      { q: "What is 2 + 2?", choices: ["3", "4", "5"], correct: 1 },
      { q: "What color is the sky on a clear day?", choices: ["Green", "Blue", "Red"], correct: 1 },
      { q: "What is the largest planet in our solar system?", choices: ["Earth", "Jupiter", "Saturn"], correct: 1 },
      { q: "How many days are in a week?", choices: ["5", "6", "7"], correct: 2 },
      { q: "What is the smallest prime number?", choices: ["1", "2", "3"], correct: 1 },
      { q: "What animal is known as the 'King of the Jungle'?", choices: ["Tiger", "Lion", "Bear"], correct: 1 },
      { q: "What is the freezing point of water in Celsius?", choices: ["-1°C", "0°C", "1°C"], correct: 1 },
      { q: "How many sides does a triangle have?", choices: ["2", "3", "4"], correct: 1 }
    ],
    100: [
      { q: "Who wrote 'Romeo and Juliet'?", choices: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"], correct: 1 },
      { q: "What is the chemical symbol for gold?", choices: ["Go", "Gd", "Au", "Ag"], correct: 2 },
      { q: "In which year did World War II end?", choices: ["1943", "1944", "1945", "1946"], correct: 2 },
      { q: "What is the speed of light in vacuum (approximately)?", choices: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"], correct: 0 },
      { q: "What is the largest ocean on Earth?", choices: ["Atlantic", "Indian", "Arctic", "Pacific"], correct: 3 },
      { q: "Who painted the Mona Lisa?", choices: ["Vincent van Gogh", "Leonardo da Vinci", "Pablo Picasso", "Michelangelo"], correct: 1 },
      { q: "What is the smallest country in the world?", choices: ["Monaco", "Vatican City", "San Marino", "Liechtenstein"], correct: 1 },
      { q: "How many elements are in the periodic table (as of 2023)?", choices: ["110", "115", "118", "120"], correct: 2 },
      { q: "What is the longest river in the world?", choices: ["Amazon", "Nile", "Mississippi", "Yangtze"], correct: 1 },
      { q: "In which continent is the Sahara Desert located?", choices: ["Asia", "Africa", "Australia", "South America"], correct: 1 }
    ],
    200: [
      { q: "What is the molecular formula for water?", choices: ["H2O", "CO2", "NaCl", "O2", "H2SO4"], correct: 0 },
      { q: "Who discovered penicillin?", choices: ["Louis Pasteur", "Alexander Fleming", "Marie Curie", "Robert Koch", "Joseph Lister"], correct: 1 },
      { q: "What is the approximate age of the universe in billions of years?", choices: ["10.5", "12.5", "13.8", "15.2", "18.5"], correct: 2 },
      { q: "Which programming language was created by Guido van Rossum?", choices: ["Java", "C++", "Python", "JavaScript", "Ruby"], correct: 2 },
      { q: "What is the name of the process by which plants convert light into energy?", choices: ["Respiration", "Photosynthesis", "Fermentation", "Oxidation", "Digestion"], correct: 1 },
      { q: "Who wrote 'The Theory of Relativity'?", choices: ["Isaac Newton", "Albert Einstein", "Niels Bohr", "Stephen Hawking", "Galileo Galilei"], correct: 1 },
      { q: "What is the largest prime number discovered as of 2023?", choices: ["2^82,589,933 - 1", "2^77,232,917 - 1", "2^74,207,281 - 1", "2^57,885,161 - 1", "2^43,112,609 - 1"], correct: 0 },
      { q: "In which year was the first iPhone released?", choices: ["2005", "2006", "2007", "2008", "2009"], correct: 2 },
      { q: "What is the name of the theoretical boundary around a black hole?", choices: ["Event horizon", "Schwarzschild radius", "Singularity", "Accretion disk", "Photon sphere"], correct: 0 },
      { q: "Who composed 'The Four Seasons'?", choices: ["Bach", "Mozart", "Vivaldi", "Beethoven", "Chopin"], correct: 2 }
    ]
  }
  
  const questions = questionSets[difficulty as keyof typeof questionSets]
  const selected = questions[Math.floor(Math.random() * questions.length)]
  
  return {
    question: selected.q,
    choices: selected.choices,
    correctAnswer: selected.correct,
    points: difficulty
  }
}

function TriviaGame({ onComplete, difficulty }: TriviaGameProps) {
  const theme = useTheme()
  const [question, setQuestion] = useState<TriviaQuestion | null>(null)
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null)
  const [timeLeft, setTimeLeft] = useState(20)
  const [isAnswered, setIsAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const hasCompletedRef = useRef(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const onCompleteRef = useRef(onComplete)

  // Keep onComplete ref up to date
  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  // Generate question on mount (only when difficulty changes)
  useEffect(() => {
    const newQuestion = generateTriviaQuestion(difficulty)
    setQuestion(newQuestion)
    setTimeLeft(20)
    setIsAnswered(false)
    setSelectedAnswer(null)
    hasCompletedRef.current = false

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    // Start timer
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - answer is wrong
          if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
          }
          if (!hasCompletedRef.current) {
            hasCompletedRef.current = true
            setIsAnswered(true)
            setIsCorrect(false)
            // Complete with 0 points after a short delay
            setTimeout(() => {
              onCompleteRef.current(0, difficulty)
            }, 2000)
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [difficulty]) // Only depend on difficulty, not onComplete

  const handleAnswerSelect = (index: number) => {
    if (isAnswered || hasCompletedRef.current) return

    setSelectedAnswer(index)
    setIsAnswered(true)
    
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    const correct = index === question?.correctAnswer
    setIsCorrect(correct)
    
    // Complete after showing result
    setTimeout(() => {
      if (!hasCompletedRef.current) {
        hasCompletedRef.current = true
        onCompleteRef.current(correct ? difficulty : 0, difficulty)
      }
    }, 2000)
  }

  if (!question) {
    return (
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          Loading question...
        </Typography>
      </Paper>
    )
  }

  return (
    <Box sx={{ mt: 3, p: 4, bgcolor: 'background.paper', borderRadius: 2, boxShadow: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" gutterBottom>
          Trivia Challenge - {difficulty} Points
        </Typography>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 'bold',
            color: (timeLeft !== undefined && timeLeft <= 5) 
              ? theme.palette.error.main 
              : theme.palette.primary.main
          }}
        >
          {timeLeft !== undefined ? `${timeLeft}s` : '20s'}
        </Typography>
      </Box>

      {isAnswered && (
        <Alert 
          severity={isCorrect ? 'success' : 'error'} 
          sx={{ mb: 3 }}
        >
          <Typography variant="h6">
            {isCorrect ? '🎉 Correct! You earned ' + difficulty + ' points!' : '❌ Incorrect! The correct answer was: ' + question.choices[question.correctAnswer]}
          </Typography>
        </Alert>
      )}

      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold' }}>
          {question.question}
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {question.choices.map((choice, index) => {
            let buttonColor: 'primary' | 'success' | 'error' | undefined = undefined
            if (isAnswered) {
              if (index === question.correctAnswer) {
                buttonColor = 'success'
              } else if (index === selectedAnswer && !isCorrect) {
                buttonColor = 'error'
              }
            } else if (index === selectedAnswer) {
              buttonColor = 'primary'
            }

            return (
              <Button
                key={index}
                variant={index === selectedAnswer ? 'contained' : 'outlined'}
                color={buttonColor}
                size="large"
                onClick={() => handleAnswerSelect(index)}
                disabled={isAnswered || hasCompletedRef.current}
                sx={{
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                  py: 2,
                  fontSize: '1.1rem',
                  '&:hover': {
                    transform: !isAnswered ? 'scale(1.02)' : 'none',
                  },
                  transition: 'transform 0.2s',
                }}
              >
                {String.fromCharCode(65 + index)}. {choice}
              </Button>
            )
          })}
        </Box>
      </Paper>

      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
        {isAnswered 
          ? (isCorrect ? 'Great job!' : 'Better luck next time!')
          : 'Select your answer before time runs out!'}
      </Typography>
    </Box>
  )
}

export default TriviaGame

