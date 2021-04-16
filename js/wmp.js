// Widen My Path 2 javascript library

var wmp = (function ($) {
	
	'use strict';	
	
	return {
		
	// Public functions
		
		// Main function
		initialise: function ()
		{
			wmp.initUi ();
		},
		
		
		// Function to initialise the UI
		initUi: function ()
		{
			// Segmented controls
			wmp.segmentedControl ();

			// Toolbox drawers
			wmp.toolbox ();
		},

		
		// Segmented control
		segmentedControl: function ()
		{
			// Constants
			const SEGMENTED_CONTROL_BASE_SELECTOR = ".ios-segmented-control";
			const SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR = ".ios-segmented-control .option input";
			const SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR = ".ios-segmented-control .selection";
			
			forEachElement(SEGMENTED_CONTROL_BASE_SELECTOR, (elem) => {
				elem.addEventListener ('change', updatePillPosition);
			});
			window.addEventListener ('resize',
				updatePillPosition
			); // Prevent pill from detaching from element when window resized. Becuase this is rare I haven't bothered with throttling the event
			
			function updatePillPosition () {
				forEachElement (SEGMENTED_CONTROL_INDIVIDUAL_SEGMENT_SELECTOR, (elem, index) => {
					if (elem.checked) moveBackgroundPillToElement (elem, index);
				});
			}
		
			function moveBackgroundPillToElement (elem, index) {
				document.querySelector (SEGMENTED_CONTROL_BACKGROUND_PILL_SELECTOR).style.transform = 'translateX(' + (elem.offsetWidth * index) + 'px)';
			}
			
			// Helper functions
			function forEachElement (className, fn) {
				Array.from (document.querySelectorAll (className)).forEach (fn);
			}
		},


		// Enable toolbox drawers
		toolbox: function () 
		{
			// Ensure correct default position
			$.each($('.toolbox-header'), function (indexInArray, toolboxHeader) { 
				
				// If any of these are NOT set to be open
				if (!$(toolboxHeader).hasClass('toolbox-open')) {
					
					// Hide the contents
					$(toolboxHeader).find ('.group-contents').hide ();

					// Add chevron to the right >
					$(toolboxHeader).find ('i').addClass ('rotated');
				} else {
					// For those that are open
					// Show the contents
					$(toolboxHeader).find ('.group-contents').show ();

					// Add down chevron, indicating open
					$(toolboxHeader).find ('i').removeClass ('rotated');
				}
			});

			// Enable toolbox headers to be clickable
			$('.toolbox-header>h5').on ('click', function (event) {
				toggleToolbox (event);
			});

			// Enable toolbox chevrons to be clickable
			$('.toolbox-header>i').on ('click', function (event) {
				toggleToolbox (event);
			});

			// Function to toggle a toolbox open or closed
			var toggleToolbox = function (event) {
				// Get current toolbox drawer status
				var toolboxHeader = $($(event.target)).closest ('.toolbox-header').first();
				var isOpen = $(toolboxHeader).hasClass ('toolbox-open');

				if (isOpen) {
					$(toolboxHeader).removeClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().addClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				} else {
					$(toolboxHeader).addClass ('toolbox-open');
					$(toolboxHeader).find ('i').first ().removeClass ('rotated');
					$(toolboxHeader).find ('.group-contents').first ().slideToggle ();
				}
				
			};

			// Display a toolbox card when the element is selected
			// !TODO having "read" the card once could be saved as a cookie, so the user doesn't have to constantly do this extra step to add map elements
			$('.toolbox .group-contents ul li').on ('click', function () {
				$('.toolbox-card').slideDown ();
			});

			// Enable the toolbox card to be closed
			$('.close-card').on ('click', function (){
				$('.toolbox-card').slideUp ();
			});

			// Initially, hide the toolbox popup
			$('.toolbox-card').hide ();
		}
	};
	
} (jQuery));
