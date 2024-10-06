// Flag to track if chatbot is speaking
let isSpeaking = false;
let interruptDetected = false;

// Function to handle sending query and receiving response
// Generate a unique sessionId (you could use a UUID generator or any unique string)

let messageQueue = [];
let isProcessing = false;

async function processQueue() {
    if (isProcessing || messageQueue.length === 0) return;

    isProcessing = true;
    const message = messageQueue.shift();  // Get the first message in the queue

    await sendQueryToServer(message);  // Send the message

    isProcessing = false;
    processQueue();  // Process the next message if available
}

function addMessageToQueue(message) {
    messageQueue.push(message);
    processQueue();  // Start processing the queue if not already processing
}




let sessionId = localStorage.getItem('chatSessionId');

if (!sessionId) {
    sessionId = Date.now().toString(); // Use timestamp as a simple unique ID
    localStorage.setItem('chatSessionId', sessionId); // Save it in localStorage to persist across page reloads
}

async function sendQueryToServerWithRetry(queryText, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('https://animation-bot-production.up.railway.app/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ queryText, sessionId }),
            });

            const data = await response.json();
            return data.response; // Return the response from the server
        } catch (error) {
            console.error(`Attempt ${attempt} failed:`, error);
            if (attempt === retries) {
                return "Something went wrong while communicating with the server.";
            }
        }
    }
}



// Get the video element
const videoCharacter = document.getElementById('video-character');
let defaultVideoPath = 'defa.mp4'; // Path to the default video

// Function to smoothly transition between videos
function changeVideo(path) {
    // Fade out the current video
    videoCharacter.style.opacity = 0;

    setTimeout(() => {
        // Change the video source after the fade-out
        videoCharacter.src = path;
        videoCharacter.load();  // Reload the video
        videoCharacter.play();  // Play the new video

        // Fade in the new video after changing the source
        videoCharacter.style.opacity = 1;
    }, 300); // Adjust delay for a smoother transition (300ms)
}

// Load the default video on page load with looping enabled
window.onload = function () {
    videoCharacter.src = defaultVideoPath;
    videoCharacter.loop = true;  // Set the video to loop
    videoCharacter.play(); // Play the default video
    videoCharacter.style.opacity = 1; // Ensure video is visible
};

// Function to get available voices and select a female voice
let voices = [];

function getVoices() {
    voices = speechSynthesis.getVoices();
    return voices.find(voice => voice.name.toLowerCase().includes('female')) || voices[0]; // Fallback to first voice if no "female" voice found
}

// Function to handle chatbot response with interruption
// Function to handle chatbot response with interruption
async function chatbotReply(userMessage) {
  if (interruptDetected) return;  // If interrupt detected, do not proceed with chatbot response

  const chatOutput = document.getElementById('chat-output');
  chatOutput.innerHTML = ''; // Clear previous messages

  // Fetch response from the server
  const text = await sendQueryToServer(userMessage);

  const newMessage = document.createElement('div');
  newMessage.textContent = "😀 " + text;
  chatOutput.appendChild(newMessage);

  // Use speech synthesis for the chatbot's voice
  let utterance = new SpeechSynthesisUtterance(text);

  // Set voice to a female voice or adjust pitch/rate for effect
  const femaleVoice = getVoices();
  utterance.voice = femaleVoice;
  utterance.pitch = 1.2;  // Slightly higher pitch (range: 0 - 2)
  utterance.rate = 1.0;   // Normal speaking rate (range: 0.1 - 10)

  // Start the chatbot video when the chatbot starts speaking
  utterance.onstart = function () {
      changeVideo('video.mp4'); // Change to the chatbot interaction video
      isSpeaking = true; // Chatbot starts speaking
      interruptDetected = false; // Reset interrupt flag
  };

  // Stop the chatbot video and switch back to the default video when speech ends
  utterance.onend = function () {
      changeVideo(defaultVideoPath); // Change back to the default video
      isSpeaking = false; // Chatbot stops speaking
  };

  speechSynthesis.speak(utterance);
}

// Function to handle user interruptions
// Function to handle user interruptions
let debounceTimer;
function handleInterruption() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        if (isSpeaking && !interruptDetected) {
            interruptDetected = true;
            speechSynthesis.cancel();
            changeVideo(defaultVideoPath);
            
            setTimeout(() => {
                let hardcodedUtterance = new SpeechSynthesisUtterance("Excuse me, you were saying something? Can you repeat again?");
                hardcodedUtterance.voice = getVoices();
                hardcodedUtterance.pitch = 1.2;
                hardcodedUtterance.rate = 1.0;
                
                hardcodedUtterance.onstart = function () {
                    changeVideo('video.mp4');
                    isSpeaking = true;
                };
                
                hardcodedUtterance.onend = function () {
                    changeVideo(defaultVideoPath);
                    interruptDetected = false;
                    isSpeaking = false;
                    recognition.start(); // Restart listening
                };
                
                speechSynthesis.speak(hardcodedUtterance);
            }, 2000); // 2 seconds delay
        }
    }, 500); // Debounce timer to prevent frequent interruptions
}


// Modified to handle user input and chatbot response with interruption check
document.getElementById('send-button').addEventListener('click', async function () {
    const chatInput = document.getElementById('chat-input');
    const userMessage = chatInput.value;

    if (userMessage.trim() !== '') {
        // If the chatbot is speaking, handle the interruption
        if (isSpeaking) {
            handleInterruption();
        } else {
            // Clear previous chats
            const chatOutput = document.getElementById('chat-output');
            chatOutput.innerHTML = ''; // Clear chat history

            // Display user message
            const userDiv = document.createElement('div');
            userDiv.textContent = "👤 " + userMessage;
            chatOutput.appendChild(userDiv);

            // Clear input field
            chatInput.value = '';

            // Get chatbot reply
            await chatbotReply(userMessage);
        }
    }
});

// Listen for Enter key trigger
document.getElementById('chat-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        document.getElementById('send-button').click();
    }
});

// Get microphone button and input field
const micButton = document.getElementById('mic-button');

// Function to toggle the microphone and start speech recognition after interruption
let recognizing = false;

function toggleMic() {
    const listeningAnimation = document.getElementById('listening-animation');

    if (recognizing) {
        recognition.stop(); // Manually stop recognition
        recognizing = false;
        document.getElementById('micButton').textContent = 'Start Listening';
        listeningAnimation.style.display = 'none'; // Hide animation
    } else {
        recognition.start();
        recognizing = true;
        document.getElementById('micButton').textContent = 'Stop Listening';
        listeningAnimation.style.display = 'block'; // Show animation
    }

    // Handle recognition end (restart unless stopped manually)
    recognition.onend = function () {
        if (recognizing) {
            console.log('Recognition ended, restarting...');
            recognition.start();  // Restart recognition automatically if it should keep listening
        } else {
            console.log('Recognition stopped manually.');
        }
    };
    

    // Handle recognition errors
    let retryCount = 0;
    const maxRetries = 5;
    
    recognition.onerror = function (event) {
        console.log('Recognition error:', event.error);
        recognizing = false;
    
        if (event.error === 'network' || event.error === 'no-speech') {
            recognition.start();  // Restart recognition if appropriate
        }
    };

    recognition.onerror = function (event) {
        if (event.error === 'not-allowed') {
            console.error('Permission to use microphone not granted.');
            alert('Please allow microphone access.');
        } else if (event.error === 'network') {
            console.error('Network error. Please check your connection.');
        } else {
            console.error('Speech recognition error:', event.error);
        }
    };
    
    
    
}



let recognition;

if ('webkitSpeechRecognition' in window) {
    recognition = new webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = function (event) {
        let transcript = event.results[event.resultIndex][0].transcript.trim();
        document.getElementById("chat-input").value = transcript;
        document.getElementById('chat-output').innerHTML += `<p>User: ${transcript}</p>`;
    
        // Add the captured message to the queue for processing
        addMessageToQueue(transcript);
        // Simulate clicking the send button to handle chatbot response
        document.getElementById('send-button').click();
    };

    recognition.onerror = function (event) {
        console.log('Error occurred in recognition: ' + event.error);
    };

    recognition.onend = function () {
        recognizing = false;
        document.getElementById('micButton').textContent = 'Start Listening';
    };
}

// Ensure voices are loaded before using them
window.speechSynthesis.onvoiceschanged = getVoices;

// Function to say the welcome message with video change
function welcomeUser() {
    const welcomeText = "Hello there, my name is Kiki the Rabbit , Whats Your Name?";
    let welcomeUtterance = new SpeechSynthesisUtterance(welcomeText);

    // Set voice to a female voice or adjust pitch/rate for effect
    const femaleVoice = getVoices();
    welcomeUtterance.voice = femaleVoice;
    welcomeUtterance.pitch = 1.2; // Slightly higher pitch
    welcomeUtterance.rate = 1.0;   // Normal speaking rate
    document.getElementById('welcome-button').style.display = 'none';

    // Change to the chatbot interaction video when speaking starts
    welcomeUtterance.onstart = function () {
        changeVideo('video.mp4'); // Change to the interaction video
        isSpeaking = true; // Chatbot starts speaking
    };

    // Change back to the default video when speech ends
    welcomeUtterance.onend = function () {
        changeVideo(defaultVideoPath); // Change back to the default video
        isSpeaking = false; // Chatbot stops speaking
    };

    // Start speaking the welcome message
    speechSynthesis.speak(welcomeUtterance);
}

// Add event listener to the welcome button
document.getElementById('welcome-button').addEventListener('click', welcomeUser);


function toggleChatOutput() {
    const chatOutput = document.getElementById('chat-output');
    const toggleButton = document.getElementById('toggle-chat-button');

    // Check the current display status of chat output
    if (chatOutput.style.display === 'none') {
        chatOutput.style.display = 'block'; // Show chat output
        toggleButton.textContent = 'Hide Text'; // Update button text
    } else {
        chatOutput.style.display = 'none'; // Hide chat output
        toggleButton.textContent = 'View Text'; // Update button text
    }
}
