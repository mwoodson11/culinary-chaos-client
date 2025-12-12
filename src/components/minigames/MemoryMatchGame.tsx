import { Box, Grid, Card, CardContent, Typography } from '@mui/material'
import { useState, useEffect } from 'react'
import QuestionMarkIcon from '@mui/icons-material/HelpOutline'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

interface MemoryCard {
  id: number
  value: number // 1-8 for the 8 pairs
  isFlipped: boolean
  isMatched: boolean
}

interface MemoryMatchGameProps {
  onComplete: (matchesFound: number) => void
  timeLeft: number
}

// Icons/emojis for the card values (8 different pairs)
const cardIcons = [
  '🍰', '🎂', '🍪', '🧁',
  '🍩', '🥧', '🍫', '🍬'
]

function MemoryMatchGame({ onComplete, timeLeft }: MemoryMatchGameProps) {
  const [cards, setCards] = useState<MemoryCard[]>([])
  const [flippedCards, setFlippedCards] = useState<number[]>([])
  const [matchesFound, setMatchesFound] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  // Initialize cards on mount
  useEffect(() => {
    initializeCards()
  }, [])

  // Check for game completion
  useEffect(() => {
    if (matchesFound === 8) {
      // All pairs matched!
      const timeout = setTimeout(() => {
        onComplete(matchesFound)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [matchesFound]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-complete if time runs out
  useEffect(() => {
    if (timeLeft <= 0 && matchesFound < 8) {
      onComplete(matchesFound)
    }
  }, [timeLeft, matchesFound]) // eslint-disable-line react-hooks/exhaustive-deps

  const initializeCards = () => {
    // Create 8 pairs (values 1-8)
    const cardValues: number[] = []
    for (let i = 1; i <= 8; i++) {
      cardValues.push(i, i) // Add each value twice
    }
    
    // Shuffle the array
    const shuffled = cardValues.sort(() => Math.random() - 0.5)
    
    // Create card objects
    const newCards: MemoryCard[] = shuffled.map((value, index) => ({
      id: index,
      value,
      isFlipped: false,
      isMatched: false
    }))
    
    setCards(newCards)
  }

  const handleCardClick = (cardId: number) => {
    // Don't allow clicks if:
    // - Card is already flipped or matched
    // - We're processing a match check
    // - Two cards are already flipped
    const card = cards[cardId]
    if (card.isFlipped || card.isMatched || isProcessing || flippedCards.length >= 2) {
      return
    }

    // Flip the card
    const newCards = [...cards]
    newCards[cardId].isFlipped = true
    setCards(newCards)
    setFlippedCards([...flippedCards, cardId])

    // If two cards are now flipped, check for a match
    if (flippedCards.length === 1) {
      setIsProcessing(true)
      setTimeout(() => {
        checkMatch([...flippedCards, cardId])
      }, 1000) // Wait 1 second to show both cards
    }
  }

  const checkMatch = (flipped: number[]) => {
    const [firstId, secondId] = flipped
    const firstCard = cards[firstId]
    const secondCard = cards[secondId]

    if (firstCard.value === secondCard.value) {
      // Match found!
      const newCards = [...cards]
      newCards[firstId].isMatched = true
      newCards[secondId].isMatched = true
      newCards[firstId].isFlipped = true
      newCards[secondId].isFlipped = true
      setCards(newCards)
      setMatchesFound(matchesFound + 1)
    } else {
      // No match - flip cards back
      const newCards = [...cards]
      newCards[firstId].isFlipped = false
      newCards[secondId].isFlipped = false
      setCards(newCards)
    }

    // Reset flipped cards and processing state
    setFlippedCards([])
    setIsProcessing(false)
  }

  return (
    <Box sx={{ mt: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Matches Found: {matchesFound} / 8
        </Typography>
        <Typography variant="h6" color={timeLeft <= 10 ? 'error' : 'text.primary'}>
          Time: {timeLeft}s
        </Typography>
      </Box>

      <Grid container spacing={2} sx={{ maxWidth: 600, mx: 'auto' }}>
        {cards.map((card) => (
          <Grid item xs={3} key={card.id}>
            <Card
              sx={{
                aspectRatio: '1',
                cursor: card.isMatched || isProcessing || flippedCards.length >= 2 ? 'default' : 'pointer',
                opacity: card.isMatched ? 0.6 : 1,
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: card.isMatched || card.isFlipped || isProcessing || flippedCards.length >= 2 ? 'none' : 'scale(1.05)'
                },
                bgcolor: card.isMatched 
                  ? 'success.light' 
                  : card.isFlipped 
                    ? 'primary.light' 
                    : 'grey.300',
                border: card.isFlipped ? 2 : 1,
                borderColor: card.isFlipped ? 'primary.main' : 'grey.400'
              }}
              onClick={() => handleCardClick(card.id)}
            >
              <CardContent
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  p: 1
                }}
              >
                {card.isMatched ? (
                  <CheckCircleIcon sx={{ fontSize: 40, color: 'success.main' }} />
                ) : card.isFlipped ? (
                  <Typography variant="h3" sx={{ fontSize: { xs: 30, sm: 40 } }}>
                    {cardIcons[card.value - 1]}
                  </Typography>
                ) : (
                  <QuestionMarkIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="body2" color="text.secondary">
          Click cards to reveal them. Find all 8 pairs to win!
        </Typography>
      </Box>
    </Box>
  )
}

export default MemoryMatchGame

