export type SampleProgram = {
  id: string
  title: string
  description: string
  code: string
  stdin: string
}

export const samplePrograms: SampleProgram[] = [
  {
    id: 'hello',
    title: 'Hello World',
    description: 'Variables, string concatenation, f-strings',
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
    description: 'input(), arithmetic, lists, f-strings',
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
    description: 'for loop, range(), running total',
    code: `total = 0
for i in range(1, 6):
    total = total + i
    print(f"After adding {i}: total = {total}")

print(f"Final sum: {total}")`,
    stdin: '',
  },
  {
    id: 'while-loop',
    title: 'While Loop',
    description: 'while condition, countdown, break',
    code: `n = 10
while n > 0:
    if n == 5:
        print("halfway!")
    n = n - 2
    print(f"n is now {n}")

print("done")`,
    stdin: '',
  },
  {
    id: 'nested-loops',
    title: 'Nested Loops',
    description: 'Nested for loops, multiplication table',
    code: `for row in range(1, 4):
    for col in range(1, 4):
        product = row * col
        print(f"{row}x{col}={product}", end="  ")
    print()`,
    stdin: '',
  },
  {
    id: 'fizzbuzz',
    title: 'FizzBuzz',
    description: 'if/elif/else branching in a loop',
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
    description: 'def, arguments, return values, call frames',
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
    id: 'recursion',
    title: 'Recursion',
    description: 'Recursive factorial, call stack depth',
    code: `def factorial(n):
    if n <= 1:
        return 1
    result = n * factorial(n - 1)
    return result

answer = factorial(5)
print(f"5! = {answer}")`,
    stdin: '',
  },
  {
    id: 'data-structures',
    title: 'Data Structures',
    description: 'Lists, dicts, iteration, mutation',
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
    id: 'aliasing',
    title: 'Aliasing & Mutation',
    description: 'Shared references, mutation vs reassignment',
    code: `a = [1, 2, 3]
b = a
b.append(4)
print(f"a = {a}")
print(f"b = {b}")
print(f"a is b: {a is b}")

c = a[:]
c.append(5)
print(f"a = {a}")
print(f"c = {c}")
print(f"a is c: {a is c}")`,
    stdin: '',
  },
  {
    id: 'class',
    title: 'Simple Class',
    description: 'Class definition, __init__, methods, instances',
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
