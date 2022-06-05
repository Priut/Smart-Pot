from machine import ADC, Pin
from machine import UART
import utime
led_red = Pin(13,Pin.OUT)
led_green = Pin(14,Pin.OUT)
#min value  448
soil = ADC(Pin(26))
readDelay = 5
ser = UART(1,9600)
dry = 100
wet = 14000
OnePercent = (wet - dry) / 100;
x=1
s=0
logat = 0
while True: 
    utime.sleep(readDelay)
    test = ser.read(10)
    print(test)
    if(str(test) =="b'delogare'"):
        logat = 0
    elif test!=None :
        logat = 1
        print(str(test))
        h12=str(test).split(" ")
        h_min = int(h12[0].replace("b'",""))
        h_max = int(h12[1].replace("'",""))
    if(logat ==1):
        soil_h = str(soil.read_u16())
    
   
        humidityPercentage = (int(soil.read_u16()) - dry) / OnePercent;
        if humidityPercentage < 0:
            humidityPercentage = 0
        if humidityPercentage > 100:
            humidityPercentage = 100
        
        if h_min < humidityPercentage and humidityPercentage < h_max:
            led_red.value(0)
            led_green.value(1)
        else:
            led_red.value(1)
            led_green.value(0)
        print(str(int(humidityPercentage)))
        ser.write(str(int(humidityPercentage)))
