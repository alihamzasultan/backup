
// Flag to track if chatbot is speaking
let isSpeaking = false;
let interruptDetected = false;

// Function to handle sending query and receiving response
// Generate a unique sessionId (you could use a UUID generator or any unique string)
let sessionId = localStorage.getItem('chatSessionId');

if (!sessionId) {
    sessionId = Date.now().toString(); // Use timestamp as a simple unique ID
    localStorage.setItem('chatSessionId', sessionId); // Save it in localStorage to persist across page reloads
}

async function sendQueryToServer(queryText) {
    try {
        const response = await fetch('', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ queryText, sessionId }), // Include sessionId in the request
        });

        const data = await response.json();
        return data.response; // Return the response from the server
    } catch (error) {
        console.error('Error:', error);
        return "Something went wrong while communicating with the server.";
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
function handleInterruption() {
  if (isSpeaking && !interruptDetected) {
      interruptDetected = true;  // Mark that an interruption is detected
      speechSynthesis.cancel();  // Stop current speech

      // Change to default video for 2 seconds
      changeVideo(defaultVideoPath);

      setTimeout(() => {
          // Play hardcoded message "DID YOU SAY ANYTHING?"
          let hardcodedUtterance = new SpeechSynthesisUtterance("Excuse me, you were saying something? Can you repeat again?");
          hardcodedUtterance.voice = getVoices();
          hardcodedUtterance.pitch = 1.2;
          hardcodedUtterance.rate = 1.0;

          hardcodedUtterance.onstart = function () {
              changeVideo('video.mp4');
              isSpeaking = true;  // Ensure the flag is set properly
          };

          hardcodedUtterance.onend = function () {
              changeVideo(defaultVideoPath); // Switch back to the default video after message
              interruptDetected = false;  // Reset interruption detection
              isSpeaking = false;  // Reset speaking flag
              recognizing = false; recognition.start(); // Automatically start listening
              toggleMic(); // Start listening again

          };

          speechSynthesis.speak(hardcodedUtterance);
      }, 2000); // 2 seconds delay
  }
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
        micButton.textContent = 'Start Listening';
        listeningAnimation.style.display = 'none'; // Hide animation
    } else {
        try {
            recognition.start();
            recognizing = true;
            micButton.textContent = 'Stop Listening';
            listeningAnimation.style.display = 'block'; // Show animation
        } catch (error) {
            console.error('Error starting microphone:', error);
            alert('Unable to start microphone. Please check your permissions and try again.');
            micButton.textContent = 'Start Listening';
        }
    }

    // Handle recognition end (restart unless stopped manually)
    recognition.onend = () => {
        if (recognizing) {
            console.log('Recognition ended, restarting...');
            recognition.start(); // Automatically restart if still listening
        } else {
            console.log('Recognition stopped manually.');
        }
    };

    // Handle recognition errors
    recognition.onerror = (event) => {
        if (event.error === 'no-speech') {
            console.log('No speech detected. Restarting...');
            if (recognizing) recognition.start(); // Restart if no speech is detected
        } else if (event.error === 'not-allowed') {
            console.error('Permission to use microphone not granted.');
            alert('Microphone access denied. Please enable it in your browser settings.');
        } else if (event.error === 'network') {
            console.error('Network error. Please check your connection.');
            alert('Network error. Please ensure you have a stable internet connection.');
        } else {
            console.error('Speech recognition error:', event.error);
            recognition.stop();
            recognizing = false;
            micButton.textContent = 'Start Listening';
            listeningAnimation.style.display = 'none';
            alert(`An error occurred with speech recognition: ${event.error}`);
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
        let message = transcript; // Captured message
        document.getElementById('chat-output').innerHTML += `<p>User: ${message}</p>`;

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
