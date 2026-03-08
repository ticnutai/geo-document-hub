import sys
print("Python version:", sys.version, file=sys.stderr)
print("Hello from Python!", flush=True)
open("_test_output.txt", "w").write("it works")
