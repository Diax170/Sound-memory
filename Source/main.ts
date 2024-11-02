led.enable(false)

// Component pins
const led_pins = [DigitalPin.P6, DigitalPin.P7, DigitalPin.P8, DigitalPin.P9, DigitalPin.P10]
const btn_pins = [DigitalPin.P11, DigitalPin.P2, DigitalPin.P3, DigitalPin.P4, DigitalPin.P5]

// Set pull up for each button
for (let pin of btn_pins) {
    pins.setPull(pin, PinPullMode.PullUp)
}

// Shift register pins
const stcp_pin = DigitalPin.P16
const ds_pin = DigitalPin.P15
const shcp_pin = DigitalPin.P13

// 7 segment display pins and digits values
const dig1_pin = DigitalPin.P1
const dig2_pin = DigitalPin.P14
const digits = [ // The 2nd bit is the decimal point
    '10110111',  // 0
    '10000010',  // 1
    '00111011',  // 2
    '10011011',  // 3
    '10001110',  // 4
    '10011101',  // 5
    '10111101',  // 6
    '10000111',  // 7
    '10111111',  // 8
    '10011111'   // 9
]

// Game variables
let score: number
let prev_score: number
let pattern: number[]
const notes: Note[] = [Note.C, Note.D, Note.E, Note.F, Note.G]
let display_mode: number  // 0 - display score, 1 - display 'no', 2 - stop displaying


function push(data: string) {
    // This function pushes some data into the shift register
    for (let bit = 0; bit < data.length; bit++) {
        pins.digitalWritePin(ds_pin, parseInt(data[data.length - bit - 1]))
        pins.digitalWritePin(shcp_pin, 1)
        control.waitMicros(1)
        pins.digitalWritePin(shcp_pin, 0)
        control.waitMicros(1)
    }
    pins.digitalWritePin(stcp_pin, 1)
    control.waitMicros(1)
    pins.digitalWritePin(stcp_pin, 0)
}

// 7 segment display functions
function display_dig1(dig1: string) {
    push(dig1)
    pins.digitalWritePin(dig1_pin, 0)
    pins.digitalWritePin(dig2_pin, 1)
}

function display_dig2(dig2: string) {
    push(dig2)
    pins.digitalWritePin(dig1_pin, 1)
    pins.digitalWritePin(dig2_pin, 0)
}

function display_both(dig12: string) {
    push(dig12)
    pins.digitalWritePin(dig1_pin, 0)
    pins.digitalWritePin(dig2_pin, 0)
}

function display_clear() {
    pins.digitalWritePin(dig1_pin, 1)
    pins.digitalWritePin(dig2_pin, 1)
    push('00000000')
}

function display(dig1: string, dig2: string) {
    display_dig1(dig1)
    basic.pause(5)
    display_dig2(dig2)
    basic.pause(5)
}

// Game functions
function initialize() {  // Initialize the game
    score = 0
    prev_score = -1
    pattern = []
    display_mode = 0
    music.setTempo(60)  // Set game speed (higher = faster). The speed increases with the score
}

function show_pattern(add: boolean=true) {
    if (add) {
        pattern.push(randint(0, 4))
    }
    for (let item of pattern) {
        pulse_led(item)
        music.rest(music.beat(BeatFraction.Quarter))  // Wait 1/4 beat
    }
    laser_sfx()
}

function get_pressed_btn() {
    // Returns the id of pressed button, if none of buttons are pressed returns -1
    for (let i = 0; i < btn_pins.length; i++) {
        if (pins.digitalReadPin(btn_pins[i]) == 0) {
            return i
        }
    }
    return -1
}

function pulse_led(id: number) {
    // Pulse an led and make a sound
    music.stopAllSounds()
    pins.digitalWritePin(led_pins[id], 1)
    music.play(music.tonePlayable(notes[id], music.beat(BeatFraction.Quarter)), music.PlaybackMode.UntilDone)
    pins.digitalWritePin(led_pins[id], 0)
}


function laser_sfx() {
    music.stopAllSounds()

    // Play the laser sfx from the library
    music.play(music.createSoundExpression(WaveShape.Square, 1600, 1, 255, 0, 300, SoundExpressionEffect.None, InterpolationCurve.Curve), music.PlaybackMode.UntilDone)
}


// Script
// Disable sounds if holding button no. 5
if (pins.digitalReadPin(btn_pins[4]) == 0) {
    music.setVolume(0)
}

// Intro
music._playDefaultBackground(music.builtInPlayableMelody(Melodies.PowerUp), music.PlaybackMode.InBackground)  // Play the power up melody

for (let i = 0; i < 2; i++) {
    display_both('11111111')
}

for (let i = 0; i < 2; i++) {  // Repeat 2 times
    for (let led of led_pins.slice(0, 4)) {  // Execute for items 0-3 of led_pins
        pins.digitalWritePin(led, 1)
        basic.pause(125)
        pins.digitalWritePin(led, 0)
    }
}

basic.pause(125)

for (let i = 0; i < 3; i++) {  // Repeat 3 times
    pins.digitalWritePin(led_pins[4], 1)
    basic.pause(125)
    pins.digitalWritePin(led_pins[4], 0)
    basic.pause(125)
}

// Display 'hi' for 2 secs
let timer = input.runningTime()
while (input.runningTime() - timer < 1000) {
    display('10101100', '10000000')
}

display_clear()
basic.pause(500)

initialize()  // Initialize the game

// Main loop
basic.forever(function () {
    show_pattern()
    for (let item of pattern) {
        // Wait until a button is pressed
        while (get_pressed_btn() == -1) {
            basic.pause(10)
        }
        basic.pause(20)  // Debouncing

        if (get_pressed_btn() == item) {  // If pressed correct button
            pulse_led(item)
        } else {  // If pressed incorrect button
            // Display 'no' and ring the note A
            display_mode = 1
            music.ringTone(Note.A)
            basic.pause(1000)

            // Clear the display
            display_mode = 2
            basic.pause(20)
            display_clear()

            laser_sfx()
            basic.pause(1000)

            // Bring the score back to the 7 segment display
            display_mode = 0
            prev_score = -1

            show_pattern(false)  // Show the correct pattern
            
            basic.pause(200)

            // Display two decimal points
            display_mode = 2
            basic.pause(20)
            display_both('01000000')

            // Clear the display for some time and restart the game
            basic.pause(750)
            display_clear()
            basic.pause(500)
            break
        }

        // Wait until a button is released
        while (get_pressed_btn() != -1) {
            basic.pause(10)
        }
    }
    if (display_mode == 2) {
        initialize()  // Restart the game
    } else {
        score++

        // Increase tempo (game speed) if it's slower than 80 bpm and every 2nd time
        if (score % 2 == 0 && music.tempo() < 80) {
            music.setTempo(music.tempo() + 1)
        }

        // Wait until a button is pressed
        while (get_pressed_btn() == -1) {
            basic.pause(10)
        }
        laser_sfx()
        basic.pause(500)
    }
})

// Display score on the 7 segment display in background
basic.forever(function() {
   while (display_mode != 2) {  // The while loop is necessary or else the 7 segment display will noticeably blink
        if (display_mode == 1) {
            display('10101000', '10111000')  // Display 'no'
        } else if (score < 10) {
            if (score != prev_score) {
                prev_score = score
                display_dig2(digits[score])
            }
            basic.pause(10)
        } else {
            // This basically displays two last characters of score variable on the 7 segment display
            display(digits[parseInt(score.toString().substr(-2, 1))], digits[parseInt(score.toString().substr(-1, 1))])
        }
    }
})
