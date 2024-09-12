

// Create a div element for the overlay and set up the pennywall when the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    let shownScreens = .75
    function updateNumShownViewports(numViewports) {
        overlay.style.top = `${100*numViewports}vh`;
    }


    
    const overlay = document.createElement('div');
    overlay.style.position = 'absolute';
    overlay.style.left = '0';
    overlay.style.right = '0';
    overlay.style.top = updateNumShownViewports(shownScreens);
    overlay.style.height = '100vh';

    overlay.style.zIndex = '1000';
    overlay.style.transition = 'all 0.75s ease';

    //overlay.appendChild(blurEffect);
    // Create a separate element for the blur effect
    const blurOverlay = document.createElement('div');
    blurOverlay.style.position = 'absolute';
    blurOverlay.style.left = '0';
    blurOverlay.style.right = '0';
    blurOverlay.style.top = '0';
    blurOverlay.style.bottom = '0';
    blurOverlay.style.zIndex = '1000';
    
    blurOverlay.style.backdropFilter = 'blur(50px)';
    blurOverlay.style.WebkitBackdropFilter = 'blur(50px)'; // For Safari
    blurOverlay.style.maskImage = 'linear-gradient(to bottom, transparent 0%, black 5%)';
    blurOverlay.style.maskComposite = 'intersect';
    blurOverlay.style.transition = 'all 0.75s ease';

    overlay.appendChild(blurOverlay);

    // Check if UMA is connected by looking at local storage
    //const isUmaConnected = localStorage.getItem('umaConnected') === 'true';
    const isUmaConnected = true;

    // Create a button element
    const connectButton = document.createElement('button');
    connectButton.textContent = 'Connect';
    connectButton.style.position = 'fixed';
    connectButton.style.left = '50%';
    connectButton.style.top = '90vh';
    connectButton.style.transform = 'translateX(-50%)';
    connectButton.style.padding = '15px 30px';
    connectButton.style.fontSize = '18px';
    connectButton.style.backgroundColor = '#4a90e2';
    connectButton.style.color = 'white';
    connectButton.style.border = 'none';
    connectButton.style.borderRadius = '25px';
    connectButton.style.cursor = 'pointer';
    connectButton.style.zIndex = '1002'; // Ensure it's above the blur overlay
    connectButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    connectButton.style.transition = 'all 0.3s ease';

    // Add event listener to connectButton
    connectButton.addEventListener('click', function() {
        if (!isUmaConnected) {
            // Here you would typically implement the actual connection logic
            // For this example, we'll just simulate a connection
            localStorage.setItem('umaConnected', 'true');
            updateUIForConnectionStatus();
        }
    });


    // Create a button element
    const revealButton = document.createElement('button');
    revealButton.textContent = 'Reveal';
    revealButton.style.position = 'fixed';
    revealButton.style.left = '50%';
    revealButton.style.top = '90vh';
    revealButton.style.transform = 'translateX(-50%)';
    revealButton.style.padding = '15px 30px';
    revealButton.style.fontSize = '18px';
    revealButton.style.backgroundColor = '#800080';
    revealButton.style.color = 'white';
    revealButton.style.border = 'none';
    revealButton.style.borderRadius = '25px';
    revealButton.style.cursor = 'pointer';
    revealButton.style.zIndex = '1002'; // Ensure it's above the blur overlay
    revealButton.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    revealButton.style.transition = 'all 0.3s ease';

    // Add event listener to connectButton
    revealButton.addEventListener('click', function() {
        amountToReveal = computeAmountToReveal();
        shownScreens += 1;
        updateNumShownViewports(shownScreens);
    });


    // Add halo glowing effect on the blur overlay when hovering
    document.addEventListener('mousemove', (e) => {
        const rect = blurOverlay.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        // Move the blur overlay up a little bit
        const adjustedY = y; // Use the actual mouse Y position
        blurOverlay.style.maskImage = `
            radial-gradient(
                circle at ${x}px ${adjustedY}px,
                transparent 0%,
                black 4%
            ),
            linear-gradient(to bottom, transparent 0%, black 5%)

        `;
    });
    // Add the button to the overlay
    if (isUmaConnected) {
        overlay.appendChild(revealButton);
    } else {
        overlay.appendChild(connectButton);
    }

    function unlockViewport(viewportIndex, numViewportsToUnlock) {

    }
    // Function to adjust overlay position on scroll
    function adjustOverlayHeight(newHeight) {
        console.log('setting overlay to height ' + newHeight);
        overlay.style.height = `${newHeight}px`;
    }

    // Add the overlay to the page
    document.body.appendChild(overlay);

    // Add scroll event listener
    //window.addEventListener('scroll', adjustOverlay);
    
    // Function to check for changes in document height

    function computeAmountToReveal() {
        return 1;
    }

    function checkOverlayHeight() {
        // Assuming VH
        let topOffset = Math.round(window.innerHeight * .01 * parseInt(overlay.style.top));
        console.log('top offset ' + overlay.style.top)
        console.log('computed top offset ' + topOffset)
        
        let lastHeight = parseInt(overlay.style.height);
        console.log('last height ' + lastHeight)
        let newHeight = parseInt(document.documentElement.scrollHeight) - topOffset;
        console.log('new height ' + newHeight)
        if (newHeight !== lastHeight) {
            adjustOverlayHeight(newHeight);
            lastHeight = newHeight;
        }
    }
    

    // Call the function to start monitoring height changes
    setInterval(checkOverlayHeight, 1000);

    // Initial call to set correct position
    adjustOverlayHeight();
});