export type SampleProgram = {
  id: string
  title: string
  code: string
  stdin: string
}

export const samplePrograms: SampleProgram[] = [
  {
    id: 'hello',
    title: 'Hello World',
    code: `name = "World"
greeting = "Hello, " + name + "!"
print(greeting)
length = len(greeting)
print(f"That's {length} characters")`,
    stdin: '',
  },
  {
    id: 'calculator',
    title: 'Input & Arithmetic',
    code: `name = input("Learner name: ")
x = 4
y = x + 6
numbers = [x, y]
total = numbers[0] + numbers[1]
print(f"{name}: {total}")`,
    stdin: 'Ada',
  },
  {
    id: 'loop',
    title: 'Loop & Accumulator',
    code: `total = 0
for i in range(1, 6):
    total = total + i
    print(f"After adding {i}: total = {total}")

print(f"Final sum: {total}")`,
    stdin: '',
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    code: `for n in range(1, 16):
    if n % 15 == 0:
        print("FizzBuzz")
    elif n % 3 == 0:
        print("Fizz")
    elif n % 5 == 0:
        print("Buzz")
    else:
        print(n)`,
    stdin: '',
  },
  {
    id: 'functions',
    title: 'Functions',
    code: `def greet(name):
    message = f"Hello, {name}!"
    return message

def add(a, b):
    result = a + b
    return result

msg = greet("Alice")
print(msg)

total = add(3, 7)
print(f"3 + 7 = {total}")`,
    stdin: '',
  },
  {
    id: 'data-structures',
    title: 'Data Structures',
    code: `fruits = ["apple", "banana", "cherry"]
fruits.append("date")
print(f"Fruits: {fruits}")

scores = {"Alice": 95, "Bob": 87}
scores["Charlie"] = 92
print(f"Scores: {scores}")

for name, score in scores.items():
    print(f"  {name}: {score}")`,
    stdin: '',
  },
  {
    id: 'class',
    title: 'Simple Class',
    code: `class Dog:
    def __init__(self, name, breed):
        self.name = name
        self.breed = breed
        self.tricks = []

    def learn(self, trick):
        self.tricks.append(trick)
        return f"{self.name} learned {trick}!"

rex = Dog("Rex", "Labrador")
print(rex.learn("sit"))
print(rex.learn("shake"))
print(f"{rex.name} knows: {rex.tricks}")`,
    stdin: '',
  },
]

export const defaultSampleId = 'calculator'

export const sampleProgram = samplePrograms.find((s) => s.id === defaultSampleId)!.code
export const sampleInput = samplePrograms.find((s) => s.id === defaultSampleId)!.stdin
