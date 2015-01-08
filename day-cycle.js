ig.module(
        'plugins.day-cycle'
)
.requires(
        'impact.impact'
)
.defines(function(){
ig.DayCycle = ig.Class.extend({
    // How many hours are in a day
    totalHours: 24,

    // Set the start/end hours for the cycles
    cycles: {
        day: {
            start: 8, // Hour that this cycle set
            transition_time: 1 // Hour(s) it takes to fade to this cycle
        },
        night: {
            start: 16,
            transition_time: 1
        }
    },

    // How transparent the black night is, 0.0 - 1.0
    max_night_opacity: 0.8,

    // The current transparency of the night layer
    night_opacity: 0,

    init: function() {
        ig.global.daycycle = {
            dayTimer: new ig.Timer(),

            // The current time
            hour: 8,
            minute: 0,

            // The time remaining until the next cycle goes into effect
            cycle_remaining: {
                hour: 0,
                minute: 0,
            },

            // The current sun state, used in the HUD
            sun_state: 'day',

            transitioning: false,

            // How many days have passed in game time
            total_days: 0,

            // Number of real seconds to a minute of game time
            timeRate: 1.0,

            // Force a check of the current cycle conditions
            forceSkyCheck: true,
        };

        // Set the initial sky and ambience
        this.current_sky = this.cycles.day.color;

        // Start the cycle
        ig.global.daycycle.dayTimer.set(ig.global.daycycle.timeRate);
    },

    draw: function() {
        ig.system.context.fillStyle = 'rgba(0,0,0,' + this.night_opacity + ')';
        ig.system.context.fillRect(0, 0, ig.system.realWidth, ig.system.realHeight);
    },

    update: function() {
        // Don't update the time if the game is paused
        if (ig.game.paused) return;

        if (!ig.global.daycycle.dayTimer.disabled && ig.global.daycycle.dayTimer.delta() >= 0) {
            ig.global.daycycle.minute++;
            if (ig.global.daycycle.minute >= 60) {
                // console.log('Changed hour');
                ig.global.daycycle.minute = 0;
                ig.global.daycycle.hour++;
                ig.global.daycycle.forceSkyCheck = true;

                if (ig.global.daycycle.hour >= this.totalHours) {
                    // console.log('Reached 24 hour');
                    ig.global.daycycle.hour = 1;
                    ig.global.daycycle.forceSkyCheck = true;
                    ig.global.daycycle.total_days++;
                }
            }
            ig.global.daycycle.dayTimer.reset();
        }

        if (ig.global.daycycle.forceSkyCheck) {
            ig.global.daycycle.forceSkyCheck = false;

            var prev_cycle = ig.global.daycycle.sun_state;
            var new_cycle = ig.global.daycycle.sun_state;

            if (ig.global.daycycle.hour >= this.cycles.day.start && ig.global.daycycle.hour < this.cycles.night.start) {
                new_cycle = 'day';
            } else new_cycle = 'night';

            // // If the sky was changed, set the new sky
            if (new_cycle !== prev_cycle) {
                // Update the sun state
                ig.global.daycycle.sun_state = new_cycle;
                ig.global.daycycle.transitioning = false;
            }
        } else {
            var next_cycle = (ig.global.daycycle.sun_state == 'night') ? 'day' : 'night';
            // If we're in the last hour, set the remaining hours to the start of the next cycle
            if (ig.global.daycycle.hour === this.totalHours) ig.global.daycycle.cycle_remaining.hour = this.cycles[next_cycle].start;

            // If we're close enough to the end of the day, loop around
            else if (this.cycles[next_cycle].start - ig.global.daycycle.hour < 1) {
                ig.global.daycycle.cycle_remaining.hour = (this.totalHours - ig.global.daycycle.hour) + this.cycles[next_cycle].start;
            }

            // Otherwise, just caclulate the remainder
            else ig.global.daycycle.cycle_remaining.hour = this.cycles[next_cycle].start - ig.global.daycycle.hour - 1;

            // Set the remaining minutes
            ig.global.daycycle.cycle_remaining.minute = 60 - ig.global.daycycle.minute;

            // Calculate the total remaining minutes
            var minutesRemaining = (ig.global.daycycle.cycle_remaining.hour * 60) + ig.global.daycycle.cycle_remaining.minute;

            // How many minutes the day/night fade will take
            var transitionMinutes = this.cycles[next_cycle].transition_time * 60;

            // If we're in the time window to make the transition
            if (minutesRemaining <= transitionMinutes) {
                // Tell the daycycle object we are transitioning
                if (!ig.global.daycycle.transitioning) ig.global.daycycle.transitioning = true;

                // Set the opacity
                this.night_opacity = ((minutesRemaining.map(0, transitionMinutes, 0, (this.max_night_opacity * 10))).toPrecision(1) / 10);

                // If this is night, invert the value so it gets darker instead of lighter
                if (next_cycle == 'night') {
                    this.night_opacity = (this.max_night_opacity - this.night_opacity).toPrecision(1);
                }


            }
        }

        // Disable lights during the day, enable them at all other times
        if (ig.global.daycycle.sun_state == 'day') {
            if (ig.game.illuminated.enabled) {
                ig.game.illuminated.enabled = false;
            }
        } else if (!ig.game.illuminated.enabled) ig.game.illuminated.enabled = true;
    },
});
});

// Helper function used to map transition minutes to opacity values
Number.prototype.map = function ( in_min , in_max , out_min , out_max ) {
  return ( this - in_min ) * ( out_max - out_min ) / ( in_max - in_min ) + out_min;
};