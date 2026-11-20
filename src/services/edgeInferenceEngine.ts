import { KnowledgeItem, InferenceTelemetry, ChipSpec } from '../types/edge';

// Factory knowledge bank (v1.0.0) pre-flashed into chip ROM for ASSF
const FACTORY_KNOWLEDGE: KnowledgeItem[] = [
  // ==========================================
  // 1. PYTHON MASTERY & PROGRAMMING DOMAIN
  // ==========================================
  {
    id: 'py-01',
    triggerPattern: 'python async|asyncio|async await python|event loop python|coroutine',
    intent: 'PYTHON_ASYNCIO_PATTERNS',
    responseTemplate: `[ASSF PYTHON REASONING CORE]
Asynchronous Concurrency in Python (asyncio Event Loop):
Python's \`asyncio\` operates on a single-threaded cooperative multitasking event loop. Unlike multithreading, context switches only occur at explicit \`await\` points.

\`\`\`python
import asyncio
from typing import List

async def fetch_telemetry(sensor_id: int, delay_s: float) -> dict:
    """Non-blocking asynchronous I/O simulation."""
    await asyncio.sleep(delay_s)  # Yields control back to event loop
    return {"sensor_id": sensor_id, "reading_mv": 3280 + sensor_id * 10}

async def run_pipeline() -> List[dict]:
    # Gather runs tasks concurrently without thread context-switching overhead
    tasks = [fetch_telemetry(i, 0.1) for i in range(5)]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return results

if __name__ == "__main__":
    data = asyncio.run(run_pipeline())
    print(f"Acquired {len(data)} sensor frames: {data}")
\`\`\`
Performance: Perfect for I/O-bound edge gateways. Bypasses the Global Interpreter Lock (GIL) by releasing control during socket/file wait states.`,
    actionCode: 'PYTHON_EXEC_CODE',
    category: 'Python',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'py-02',
    triggerPattern: 'python decorator|decorator|wraps|functools|python wrapper',
    intent: 'PYTHON_DECORATOR_DESIGN',
    responseTemplate: `[ASSF PYTHON REASONING CORE]
Production-Grade Decorator Pattern in Python with Type Preservation:
Decorators wrap callable objects. Using \`@functools.wraps\` is mandatory to preserve docstrings, function signatures, and \`__name__\` metadata.

\`\`\`python
import time
import functools
from typing import Callable, Any

def execution_benchmark(retries: int = 1):
    """Parameterized decorator measuring execution latency with retry logic."""
    def decorator(func: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            for attempt in range(1, retries + 1):
                t0 = time.perf_counter_ns()
                try:
                    res = func(*args, **kwargs)
                    dt_us = (time.perf_counter_ns() - t0) / 1000
                    print(f"[{func.__name__}] Executed in {dt_us:.2f} µs")
                    return res
                except Exception as e:
                    if attempt == retries:
                        raise
                    print(f"Attempt {attempt} failed ({e}), retrying...")
        return wrapper
    return decorator

@execution_benchmark(retries=3)
def process_int8_matrix(rows: int, cols: int) -> int:
    return sum(r * c for r in range(rows) for c in range(cols))
\`\`\``,
    actionCode: 'PYTHON_EXEC_CODE',
    category: 'Python',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'py-03',
    triggerPattern: 'python generator|generator|yield|python memory|stream python',
    intent: 'PYTHON_GENERATOR_STREAMING',
    responseTemplate: `[ASSF PYTHON REASONING CORE]
Memory-Constrained Stream Processing with Generators & Yield:
Standard list: stores all elements in RAM O(N).
Generator: evaluates lazily on demand O(1) memory footprint.

\`\`\`python
from typing import Iterator

def stream_sensor_log(filepath: str, batch_size: int = 100) -> Iterator[list[str]]:
    """Yields batches of lines with O(1) RAM consumption on edge SBCs."""
    batch = []
    with open(filepath, mode="r", buffering=4096) as f:
        for line in f:
            batch.append(line.strip())
            if len(batch) >= batch_size:
                yield batch
                batch = []
        if batch:
            yield batch

# Usage: Consuming a 10GB log file inside 32MB RAM
# for frame in stream_sensor_log("/var/log/assf_telemetry.bin"):
#     process_batch(frame)
\`\`\`
Crucial for micro-SBCs (Raspberry Pi, BeagleBone) where heap memory is strictly bounded.`,
    actionCode: 'PYTHON_EXEC_CODE',
    category: 'Python',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'py-04',
    triggerPattern: 'python oop|dunder|context manager|enter exit|python class',
    intent: 'PYTHON_OOP_CONTEXT_MANAGERS',
    responseTemplate: `[ASSF PYTHON REASONING CORE]
Python OOP: Idiomatic Context Manager (\`__enter__\` / \`__exit__\`) for Hardware Bus Safety:

\`\`\`python
from typing import Optional

class I2CBusController:
    """Guarantees hardware lock release even during catastrophic runtime exceptions."""
    def __init__(self, port: int, baud: int = 400000):
        self.port = port
        self.baud = baud
        self.locked = False

    def __enter__(self) -> 'I2CBusController':
        # Hardware setup & acquire bus lock
        self.locked = True
        print(f"[I2C:{self.port}] Hardware bus locked at {self.baud} Hz")
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> Optional[bool]:
        # Guaranteed cleanup (idempotent release)
        self.locked = False
        print(f"[I2C:{self.port}] Hardware bus safely released.")
        if exc_type is not None:
            print(f"[I2C EXCEPTION CAUGHT]: {exc_val}")
        return False  # Propagate exception up stack

# Usage:
with I2CBusController(port=1) as bus:
    # Sensor read operations safely isolated
    pass
\`\`\``,
    actionCode: 'PYTHON_EXEC_CODE',
    category: 'Python',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 2. JAVA MASTERY & PROGRAMMING DOMAIN
  // ==========================================
  {
    id: 'java-01',
    triggerPattern: 'java stream|java streams|streams api|filter map reduce java|java lambda',
    intent: 'JAVA_STREAMS_FUNCTIONAL',
    responseTemplate: `[ASSF JAVA REASONING CORE]
Java 17/21 Streams API & Functional Pipeline Architecture:
Declarative data transformations with lazy evaluation and automatic parallelization via ForkJoinPool.

\`\`\`java
import java.util.*;
import java.util.stream.Collectors;

public class TelemetryStreamPipeline {
    public record SensorReading(int id, String zone, double value, boolean active) {}

    public static void main(String[] args) {
        List<SensorReading> readings = List.of(
            new SensorReading(1, "A1", 42.5, true),
            new SensorReading(2, "B2", 95.1, true),
            new SensorReading(3, "A1", 12.0, false),
            new SensorReading(4, "B2", 88.4, true)
        );

        // Group by zone, filter active only, calculate average reading
        Map<String, Double> zoneAverages = readings.stream()
            .filter(SensorReading::active)
            .filter(r -> r.value() > 20.0)
            .collect(Collectors.groupingBy(
                SensorReading::zone,
                Collectors.averagingDouble(SensorReading::value)
            ));

        zoneAverages.forEach((zone, avg) -> 
            System.out.printf("Zone: %s -> Average: %.2f%n", zone, avg));
    }
}
\`\`\`
Complexity: O(n) linear single-pass terminal operation with zero intermediate collection overhead.`,
    actionCode: 'JAVA_EXEC_CODE',
    category: 'Java',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'java-02',
    triggerPattern: 'java thread|java concurrency|executorservice|virtual threads|reentrantlock java',
    intent: 'JAVA_CONCURRENCY_PATTERNS',
    responseTemplate: `[ASSF JAVA REASONING CORE]
Modern Java Concurrency & Thread Synchronization:
Comparing ReentrantLock with condition variables and Project Loom Virtual Threads:

\`\`\`java
import java.util.concurrent.*;
import java.util.concurrent.locks.*;

public class LockFreeRingQueue<T> {
    private final Object[] items;
    private int head = 0, tail = 0, count = 0;
    private final ReentrantLock lock = new ReentrantLock(true); // Fair ordering
    private final Condition notFull = lock.newCondition();
    private final Condition notEmpty = lock.newCondition();

    public LockFreeRingQueue(int capacity) {
        this.items = new Object[capacity];
    }

    public void put(T item) throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (count == items.length) notFull.await();
            items[tail] = item;
            if (++tail == items.length) tail = 0;
            count++;
            notEmpty.signal();
        } finally {
            lock.unlock();
        }
    }

    @SuppressWarnings("unchecked")
    public T take() throws InterruptedException {
        lock.lockInterruptibly();
        try {
            while (count == 0) notEmpty.await();
            T item = (T) items[head];
            if (++head == items.length) head = 0;
            count--;
            notFull.signal();
            return item;
        } finally {
            lock.unlock();
        }
    }
}
\`\`\`
Java 21 Note: For I/O tasks, prefer \`Executors.newVirtualThreadPerTaskExecutor()\` which maps millions of virtual threads onto carrier OS threads with negligible heap impact.`,
    actionCode: 'JAVA_EXEC_CODE',
    category: 'Java',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'java-03',
    triggerPattern: 'hashmap java|java hashmap|hash table java|hash collision|bucket threshold',
    intent: 'JAVA_HASHMAP_INTERNALS',
    responseTemplate: `[ASSF JAVA REASONING CORE]
Java HashMap Internal Architecture & Collision Resolution:
1. Bucket Array: Default capacity = 16, load factor = 0.75.
2. Hash Calculation:
   \`int hash = (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);\`
   Spreads high-order bits into low-order bits to avoid modulo clustering.
3. Treeification Threshold:
   - When a bucket exceeds 8 nodes (\`TREEIFY_THRESHOLD = 8\`) and total table capacity >= 64, the linked list converts into a balanced Red-Black Tree.
   - Lookups improve from O(k) worst-case to O(log k).
   - If bucket size decreases to 6 (\`UNTREEIFY_THRESHOLD = 6\`), it converts back to a linked list to conserve memory.`,
    actionCode: 'JAVA_THEORY',
    category: 'Java',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 3. C++ MASTERY & LOW-LEVEL SYSTEMS
  // ==========================================
  {
    id: 'cpp-01',
    triggerPattern: 'c++ smart pointer|unique_ptr|shared_ptr|weak_ptr|c++ memory',
    intent: 'CPP_SMART_POINTERS_RAII',
    responseTemplate: `[ASSF C++ REASONING CORE]
Modern C++ (C++17/20) Smart Pointer Discipline:
Zero memory leaks without garbage collector pauses.

\`\`\`cpp
#include <iostream>
#include <memory>
#include <string>

class SiliconPeripheral {
public:
    explicit SiliconPeripheral(std::string name) : id_(std::move(name)) {
        std::cout << "[INIT] Peripheral: " << id_ << "\\n";
    }
    ~SiliconPeripheral() {
        std::cout << "[DESTROY] Peripheral: " << id_ << " power down\\n";
    }
    void execute() const { std::cout << "Peripheral " << id_ << " running.\\n"; }
private:
    std::string id_;
};

void demonstrateOwnership() {
    // 1. std::unique_ptr: Exclusive ownership, zero runtime overhead (1 raw pointer size)
    auto u_dev = std::make_unique<SiliconPeripheral>("ADC_CONTROLLER_0");
    u_dev->execute();
    // Cannot copy: std::unique_ptr<SiliconPeripheral> copy = u_dev; // COMPILE ERROR
    auto moved_dev = std::move(u_dev); // Transferred ownership via rvalue move

    // 2. std::shared_ptr: Shared ownership via atomic reference counting control block
    std::shared_ptr<SiliconPeripheral> s_dev = std::make_shared<SiliconPeripheral>("DMA_SPI_BUS");
    std::cout << "Ref count: " << s_dev.use_count() << "\\n"; // 1

    // 3. std::weak_ptr: Breaks cyclic dependencies without incrementing ref count
    std::weak_ptr<SiliconPeripheral> w_dev = s_dev;
    if (auto locked = w_dev.lock()) { // Safe promotion to shared_ptr
        locked->execute();
    }
}
\`\`\`
Microcontroller Rule: Always prefer \`std::unique_ptr\` on chips. Avoid \`std::shared_ptr\` unless multiple asynchronous tasks share ownership, as atomic reference counting costs CPU bus cycles.`,
    actionCode: 'CPP_EXEC_CODE',
    category: 'C++',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'cpp-02',
    triggerPattern: 'move semantics|rvalue reference|std::move|rule of 5|rule of five|c++',
    intent: 'CPP_MOVE_SEMANTICS_RULE_OF_FIVE',
    responseTemplate: `[ASSF C++ REASONING CORE]
Move Semantics (C++11/17) & Rule of Five Implementation:
Transforms expensive deep heap copies into pointer transfers (O(1)).

\`\`\`cpp
#include <utility>
#include <cstdint>
#include <cstring>

class EdgeTensorBuffer {
private:
    size_t size_;
    int8_t* data_;

public:
    explicit EdgeTensorBuffer(size_t size) : size_(size), data_(new int8_t[size]{}) {}

    // Destructor
    ~EdgeTensorBuffer() noexcept { delete[] data_; }

    // Copy Constructor (Deep Copy)
    EdgeTensorBuffer(const EdgeTensorBuffer& other) : size_(other.size_), data_(new int8_t[other.size_]) {
        std::memcpy(data_, other.data_, size_);
    }

    // Copy Assignment Operator
    EdgeTensorBuffer& operator=(const EdgeTensorBuffer& other) {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            data_ = new int8_t[size_];
            std::memcpy(data_, other.data_, size_);
        }
        return *this;
    }

    // Move Constructor (Shallow Pointer Steal)
    EdgeTensorBuffer(EdgeTensorBuffer&& other) noexcept : size_(other.size_), data_(other.data_) {
        other.size_ = 0;
        other.data_ = nullptr; // Nullify source to prevent double-free
    }

    // Move Assignment Operator
    EdgeTensorBuffer& operator=(EdgeTensorBuffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            data_ = other.data_;
            other.size_ = 0;
            other.data_ = nullptr;
        }
        return *this;
    }
};
\`\`\`
Performance: Moving a 16MB tensor buffer takes 0.4 nanoseconds instead of copying 16,777,216 bytes.`,
    actionCode: 'CPP_EXEC_CODE',
    category: 'C++',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'cpp-03',
    triggerPattern: 'c++ template|constexpr|template metaprogramming|c++ compile time',
    intent: 'CPP_CONSTEXPR_METAPROGRAMMING',
    responseTemplate: `[ASSF C++ REASONING CORE]
C++20 Constexpr & Compile-Time Computation:
Shifts mathematical computations and lookup table generation from runtime silicon cycles to compile time.

\`\`\`cpp
#include <array>
#include <cstdint>

// Evaluated strictly during compilation (zero CPU runtime cycles)
constexpr size_t TABLE_SIZE = 256;

constexpr auto generate_crc8_table() {
    std::array<uint8_t, TABLE_SIZE> table{};
    for (size_t i = 0; i < TABLE_SIZE; ++i) {
        uint8_t curr = static_cast<uint8_t>(i);
        for (int b = 0; b < 8; ++b) {
            if (curr & 0x80) curr = (curr << 1) ^ 0x07; // Polynomial x^8 + x^2 + x + 1
            else curr <<= 1;
        }
        table[i] = curr;
    }
    return table;
}

// Stored directly in MCU Flash ROM (.rodata)
static constexpr auto CRC8_LOOKUP = generate_crc8_table();

uint8_t fast_crc8(const uint8_t* data, size_t len) {
    uint8_t crc = 0x00;
    for (size_t i = 0; i < len; ++i) {
        crc = CRC8_LOOKUP[crc ^ data[i]];
    }
    return crc;
}
\`\`\`
Embedded Advantage: 0 instruction branch misses during runtime execution.`,
    actionCode: 'CPP_EXEC_CODE',
    category: 'C++',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 4. UNIVERSAL WORLD KNOWLEDGE: PHYSICS & RELATIVITY
  // ==========================================
  {
    id: 'world-phys-01',
    triggerPattern: 'relativity|einstein|general relativity|special relativity|e=mc2|time dilation|schwarzschild',
    intent: 'PHYSICS_RELATIVITY_THEORY',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: PHYSICS]
Einstein's Theories of Special and General Relativity:

1. Special Relativity (1905):
   - Postulate 1: The laws of physics are invariant across all inertial reference frames.
   - Postulate 2: The speed of light in vacuum (c = 299,792,458 m/s) is constant for all observers.
   - Lorentz Factor: γ = 1 / √(1 - v²/c²)
   - Time Dilation: Δt' = γ · Δt (moving clocks run slower)
   - Length Contraction: L' = L / γ
   - Mass-Energy Equivalence: E² = (pc)² + (m₀c²)² → For stationary mass: E = mc²

2. General Relativity (1915):
   - Gravitation is not an attraction between masses, but the curvature of 4D spacetime caused by stress-energy.
   - Einstein Field Equations:
     G_μν + Λ g_μν = (8πG / c⁴) · T_μν
     (Where G_μν is the Einstein curvature tensor, g_μν the metric tensor, and T_μν the stress-energy-momentum tensor)
   - Schwarzschild Radius (Black Hole Event Horizon):
     r_s = (2 · G · M) / c²
     (For Earth: r_s ≈ 9 mm; for the Sun: r_s ≈ 2.95 km)
   - Gravitational Time Dilation: Clocks in deeper gravitational wells tick slower. (Crucial for GPS satellite clock corrections: +38.6 µs per day drift without relativistic adjustment).`,
    actionCode: 'PHYSICS_ENCYCLOPEDIA',
    category: 'Science',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'world-phys-02',
    triggerPattern: 'quantum mechanics|schrodinger|heisenberg|uncertainty principle|wave particle|quantum',
    intent: 'PHYSICS_QUANTUM_MECHANICS',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: QUANTUM MECHANICS]
Foundational Principles of Quantum Mechanics:

1. Wave-Particle Duality (de Broglie):
   Every particle exhibits wave-like properties: λ = h / p (where h = 6.626×10⁻³⁴ J·s).

2. Heisenberg Uncertainty Principle:
   It is fundamentally impossible to simultaneously know the exact position and momentum of a quantum entity:
   Δx · Δp ≥ ℏ / 2  (where ℏ = h / (2π) ≈ 1.054×10⁻³⁴ J·s)
   Energy-Time Uncertainty: ΔE · Δt ≥ ℏ / 2

3. Schrödinger Equation (Time-Dependent):
   iℏ · (∂/∂t) |Ψ(t)⟩ = Ĥ |Ψ(t)⟩
   Where Ĥ is the Hamiltonian operator (Kinetic + Potential energy).
   The probability density of locating a particle at coordinate x is given by Born's Rule: P(x) = |Ψ(x,t)|².

4. Quantum Tunneling & Silicon Application:
   Particles have non-zero probability to traverse finite potential barriers higher than their kinetic energy.
   Modern 3nm silicon transistors must engineer around quantum tunneling gate leakage currents using FinFET and Gate-All-Around (GAA) nanosheets.`,
    actionCode: 'PHYSICS_ENCYCLOPEDIA',
    category: 'Science',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'world-phys-03',
    triggerPattern: 'thermodynamics|entropy|carnot|second law of thermodynamics|laws of thermodynamics',
    intent: 'PHYSICS_THERMODYNAMICS',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: THERMODYNAMICS]
The Four Fundamental Laws of Thermodynamics:

• Zeroth Law: If System A is in thermal equilibrium with System B, and B with C, then A is in equilibrium with C. (Defines temperature).
• First Law (Conservation of Energy):
  ΔU = Q - W
  Internal energy change equals heat added minus mechanical work performed by the system.
• Second Law (Entropy & Irreversibility):
  For any isolated system, total entropy never decreases over time: dS ≥ dQ / T.
  Clausius Statement: Heat cannot spontaneously flow from a colder to hotter reservoir without external work.
• Third Law: As absolute temperature approaches zero Kelvin (T → 0 K), the entropy of a pure crystalline substance approaches a constant minimum (S → 0).

Carnot Cycle Maximum Theoretical Heat Engine Efficiency:
η_max = 1 - (T_cold / T_hot)   (Temperatures in Kelvin)
No practical heat engine can exceed this limit due to entropy generation.`,
    actionCode: 'PHYSICS_ENCYCLOPEDIA',
    category: 'Science',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 5. UNIVERSAL WORLD KNOWLEDGE: CHEMISTRY & BIO
  // ==========================================
  {
    id: 'world-chem-01',
    triggerPattern: 'periodic table|electronegativity|gibbs free energy|stoichiometry|chemical equilibrium|chemistry',
    intent: 'CHEMISTRY_FOUNDATIONS',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: CHEMISTRY]
Core Chemical Principles & Thermodynamics:

1. Gibbs Free Energy (Spontaneity Criterion):
   ΔG = ΔH - T · ΔS
   - ΔG < 0: Exergonic reaction (Spontaneous in forward direction)
   - ΔG = 0: Chemical Equilibrium (Dynamic equilibrium, rate_fwd = rate_rev)
   - ΔG > 0: Endergonic reaction (Non-spontaneous, requires energy input)

2. Chemical Equilibrium & Le Chatelier's Principle:
   For aA + bB ⇌ cC + dD:
   Equilibrium Constant: K_eq = ([C]^c · [D]^d) / ([A]^a · [B]^b)
   Le Chatelier: If dynamic equilibrium is disturbed by changes in pressure, concentration, or temperature, the system counteracts the change to re-establish equilibrium.

3. Periodic Table Trends:
   - Atomic Radius: Increases down a group, decreases across a period (due to increasing effective nuclear charge Z_eff).
   - Electronegativity (Pauling Scale): Increases toward Fluorine (top-right, EN = 3.98), decreases toward Francium (EN = 0.7).
   - Ionization Energy: Energy required to remove the outermost electron; peaks at Noble Gases.`,
    actionCode: 'CHEM_ENCYCLOPEDIA',
    category: 'Science',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'world-bio-01',
    triggerPattern: 'dna|crispr|cellular respiration|mitochondria|atp|krebs cycle|translation transcription',
    intent: 'BIOLOGY_GENETICS_BIOCHEMISTRY',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: MOLECULAR BIOLOGY]
Central Dogma of Molecular Biology & Energy Metabolism:

1. Central Dogma:
   DNA ──(Transcription via RNA Polymerase)──► mRNA ──(Translation at Ribosome)──► Polypeptide / Protein.
   - Genetic Code: Triplet codons (64 combinations encoding 20 standard amino acids + 3 STOP codons: UAA, UAG, UGA).
   - CRISPR-Cas9: Clustered Regularly Interspaced Short Palindromic Repeats. Bacterial adaptive immune mechanism using a guide RNA (gRNA) + Cas9 endonuclease to introduce targeted double-strand breaks for gene editing.

2. Cellular Respiration (Glucose Catabolism yielding ~30-32 ATP):
   • Glycolysis (Cytosol): Glucose (C₆H₁₂O₆) → 2 Pyruvate + 2 ATP + 2 NADH (Anaerobic).
   • Pyruvate Decarboxylation & Krebs/Citric Acid Cycle (Mitochondrial Matrix):
     Generates 6 NADH, 2 FADH₂, 2 GTP/ATP per glucose molecule.
   • Oxidative Phosphorylation (Inner Mitochondrial Membrane):
     Electron Transport Chain (Complexes I-IV) pumps H⁺ ions into intermembrane space, creating electrochemical proton motive force driving ATP Synthase.`,
    actionCode: 'BIO_ENCYCLOPEDIA',
    category: 'Science',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 6. UNIVERSAL WORLD KNOWLEDGE: COSMOS & HISTORY
  // ==========================================
  {
    id: 'world-space-01',
    triggerPattern: 'big bang|black hole|neutron star|astronomy|stellar evolution|chandrasekhar|galaxy',
    intent: 'ASTRONOMY_COSMOLOGY',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: ASTROPHYSICS]
Cosmology & Stellar Evolution Lifecycles:

1. The Big Bang & Cosmic Chronology:
   - Origin: ~13.787 billion years ago from a gravitational singularity.
   - Cosmic Inflation: Exponential expansion of space within 10⁻³⁶ seconds.
   - Cosmic Microwave Background (CMB): Pervasive blackbody radiation relic at T = 2.7255 K, originating ~380,000 years post-singularity during Recombination.

2. Stellar Mass Evolution:
   - Low/Medium Mass (< 8 Solar Masses, e.g., Sun):
     Main Sequence (Hydrogen fusion via p-p chain) → Red Giant (Helium flash) → Planetary Nebula → White Dwarf (held by electron degeneracy pressure).
   - Chandrasekhar Limit: Maximum mass of a stable White Dwarf = 1.44 M_☉. Beyond this, electron degeneracy fails, collapsing into a Type Ia supernova or neutron star.
   - High Mass (> 8 M_☉):
     Successive nuclear burning (H → He → C → Ne → O → Si → Fe core) → Core-collapse Supernova.
     - Remnant 1.4 to ~2.16 M_☉: Neutron Star (pulsar/magnetar, neutron degeneracy pressure).
     - Tolman-Oppenheimer-Volkoff (TOV) Limit: > ~2.2 M_☉ collapses infinitely into a Stellar-Mass Black Hole.`,
    actionCode: 'SPACE_ENCYCLOPEDIA',
    category: 'World',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'world-hist-01',
    triggerPattern: 'history|industrial revolution|enlightenment|renaissance|civilization|human history',
    intent: 'HISTORY_CIVILIZATION_TURNING_POINTS',
    responseTemplate: `[ASSF UNIVERSAL WORLD KNOWLEDGE: WORLD HISTORY]
Pivotal Epochs in Human Technological & Civilizational Evolution:

1. Neolithic Agricultural Revolution (~10,000 BCE):
   Transition from nomadic hunter-gatherer bands to sedentary agricultural settlements in the Fertile Crescent, enabling food surpluses, permanent architecture, writing (cuneiform), and specialized labor.

2. The Printing Press (Johannes Gutenberg, ~1440 CE):
   Movable metal type democratization of text. Shattered monopolies on knowledge, catalyzed the Protestant Reformation, the Renaissance, and the Scientific Revolution.

3. Scientific Revolution & Enlightenment (16th–18th Century):
   Empirical scientific method (Bacon, Galileo, Newton's Principia 1687) replacing scholastic dogmatism with predictive mathematical models and human rights philosophy (Locke, Voltaire).

4. The Industrial Revolutions:
   - 1st (1760-1840): Steam engine (Watt), mechanized textile manufacturing, iron smelting, railways.
   - 2nd (1870-1914): Electrical grid (Tesla/Edison), internal combustion engine, petroleum, assembly line.
   - 3rd (1950s-2000): Transistor (Shockley, Bardeen, Brattain 1947), silicon microchips, personal computing, Internet.
   - 4th (Current): Autonomous edge AI (silicon-level intelligence like ASSF), cyber-physical integration, pervasive embedded intelligence.`,
    actionCode: 'HISTORY_ENCYCLOPEDIA',
    category: 'World',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 7. ALGORITHMS & DATA STRUCTURES
  // ==========================================
  {
    id: 'code-01',
    triggerPattern: 'reverse|reverse linked list|linked list|pointer',
    intent: 'ALGO_REVERSE_LINKED_LIST',
    responseTemplate: `[ASSF CODE SOLVER]
To reverse a singly linked list in O(n) time and O(1) space using iterative 3-pointer manipulation:

\`\`\`c
struct ListNode* reverseList(struct ListNode* head) {
    struct ListNode *prev = NULL, *curr = head, *next = NULL;
    while (curr != NULL) {
        next = curr->next;  // 1. Store next node
        curr->next = prev;  // 2. Reverse current pointer
        prev = curr;        // 3. Move prev forward
        curr = next;        // 4. Move curr forward
    }
    return prev; // New head of reversed list
}
\`\`\`
Key Insight: Preserves pointer invariants without allocating heap memory, making it safe for low-SRAM microcontrollers.`,
    actionCode: 'CODE_ALGO_EXEC',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'code-02',
    triggerPattern: 'binary search|search sorted array|log n|binary search c',
    intent: 'ALGO_BINARY_SEARCH',
    responseTemplate: `[ASSF CODE SOLVER]
Binary Search executes in O(log n) time. To avoid 32-bit integer overflow in calculating the midpoint:

\`\`\`c
int binarySearch(const int arr[], int size, int target) {
    int low = 0, high = size - 1;
    while (low <= high) {
        int mid = low + (high - low) / 2; // Prevents (low + high) integer overflow
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) low = mid + 1;
        else high = mid - 1;
    }
    return -1; // Target not found
}
\`\`\`
Complexity: Time O(log n), Space O(1).`,
    actionCode: 'CODE_ALGO_EXEC',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'code-03',
    triggerPattern: 'ring buffer|circular buffer|fifo|queue|uart buffer',
    intent: 'HARDWARE_RING_BUFFER',
    responseTemplate: `[ASSF EMBEDDED SYSTEM PATTERN]
Lock-free single-producer single-consumer circular ring buffer implementation for ISR (Interrupt Service Routine) handling:

\`\`\`c
#define BUFFER_SIZE 256 // Power of 2 enables bitwise masking
typedef struct {
    uint8_t buffer[BUFFER_SIZE];
    volatile uint16_t head;
    volatile uint16_t tail;
} RingBuffer;

bool ring_buffer_push(RingBuffer *rb, uint8_t byte) {
    uint16_t next = (rb->head + 1) & (BUFFER_SIZE - 1);
    if (next == rb->tail) return false; // Full
    rb->buffer[rb->head] = byte;
    rb->head = next;
    return true;
}
\`\`\`
Avoids costly modulo division (\`%\`) by using \`& (BUFFER_SIZE - 1)\`, executing in 1 clock cycle.`,
    actionCode: 'INIT_RING_BUFFER',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 8. MATHEMATICS & CALCULUS
  // ==========================================
  {
    id: 'math-01',
    triggerPattern: 'derivative|differentiation|calculus|d/dx|derivative of',
    intent: 'MATH_CALCULUS_DERIVATIVE',
    responseTemplate: `[ASSF MATHEMATICAL DERIVATION]
Fundamental Differentiation Rules:
1. Power Rule: d/dx [x^n] = n · x^(n-1)
2. Product Rule: d/dx [u · v] = u'v + uv'
3. Quotient Rule: d/dx [u / v] = (u'v - uv') / v^2
4. Chain Rule: d/dx [f(g(x))] = f'(g(x)) · g'(x)

Example: Derivative of f(x) = x³ · e^(2x)
Using Product Rule with u = x³, v = e^(2x):
u' = 3x²,  v' = 2e^(2x)
f'(x) = (3x²)(e^(2x)) + (x³)(2e^(2x)) = x² · e^(2x) · (3 + 2x)
Extrema occur at x = 0 and x = -1.5.`,
    actionCode: 'MATH_SOLVER',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'math-02',
    triggerPattern: 'quadratic|roots|ax2|quadratic formula|parabola',
    intent: 'MATH_QUADRATIC_SOLVER',
    responseTemplate: `[ASSF MATHEMATICS ENGINE]
For any quadratic equation ax² + bx + c = 0 (a ≠ 0):
Discriminant: Δ = b² - 4ac

Roots: x = (-b ± √(b² - 4ac)) / (2a)
- If Δ > 0: Two distinct real roots
- If Δ = 0: One real root (repeated root: x = -b / (2a))
- If Δ < 0: Two complex conjugate roots: x = -b/(2a) ± i(√(4ac - b²))/(2a)

Embedded Float Stability: If |b| >> 4ac, use the stable formulation:
q = -0.5 · (b + sgn(b)·√Δ), with x1 = q/a, x2 = c/q to prevent catastrophic cancellation.`,
    actionCode: 'MATH_SOLVER',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 9. ELECTRICAL CIRCUITS & HARDWARE
  // ==========================================
  {
    id: 'ee-01',
    triggerPattern: "ohm's law|ohms law|v=ir|resistance|resistor|voltage drop|current",
    intent: 'CIRCUIT_OHMS_LAW',
    responseTemplate: `[ASSF ELECTRICAL ENGINEERING SOLUTION]
Ohm's Law: V = I · R  (Voltage = Current × Resistance)
Power Dissipation: P = V · I = I² · R = V² / R

LED Resistor Calculation:
For an LED with forward voltage Vf = 2.0V and current If = 20mA powered from a 3.3V rail:
R = (V_supply - V_f) / I_f = (3.3V - 2.0V) / 0.020A = 1.3V / 0.020A = 65 Ω
Standard E24 value: Select 68 Ω (1/4 Watt).
Power = (1.3V)² / 68Ω ≈ 24.8 mW (well within 250mW resistor rating).`,
    actionCode: 'CALC_CIRCUIT',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'ee-02',
    triggerPattern: 'low pass filter|rc filter|cutoff frequency|capacitor|fc',
    intent: 'CIRCUIT_RC_FILTER',
    responseTemplate: `[ASSF HARDWARE FILTER DESIGN]
First-Order Passive RC Low-Pass Filter:
Cutoff frequency (-3dB point): f_c = 1 / (2 · π · R · C)

To design for an ADC anti-aliasing filter with f_c = 1 kHz:
Choose standard C = 100 nF (0.1 μF):
R = 1 / (2 · π · 1000 · 100×10^-9) = 1591.5 Ω → Select standard 1.6 kΩ resistor.
Phase shift at f_c: -45°. Attenuation: -20 dB/decade above cutoff.`,
    actionCode: 'FILTER_CALC',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 10. INDUSTRIAL & MEDICAL TELEMETRY
  // ==========================================
  {
    id: 'ind-01',
    triggerPattern: 'bearing|vibration|motor noise|rpm|mm/s',
    intent: 'BEARING_VIBRATION_MONITOR',
    responseTemplate: 'Vibration envelope analysis initiated. Per ISO 10816-3, RMS velocity threshold is 4.5 mm/s. Current telemetry indicates early outer raceway fault. Recommendation: Lubricate with polyurea grease and monitor high-frequency peak acceleration on Channel 1.',
    actionCode: 'SAMPLE_ADC_CH1_10KHZ',
    category: 'Industrial',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'ind-02',
    triggerPattern: 'temp|temperature|overheat|hot|thermal|cooling',
    intent: 'THERMAL_OVERLOAD_PROTECTION',
    responseTemplate: 'Stator core thermal probe reads elevated temperature. Standard Class F insulation limit is 155°C; warning alarm set at 95°C. Auxiliary cooling fan engaged on GPIO 14 via PWM 80% duty cycle.',
    actionCode: 'FAN_PWM_GPIO14_80',
    category: 'Industrial',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'med-01',
    triggerPattern: 'heart|pulse|bpm|arrhythmia|ecg|tachycardia|bradycardia',
    intent: 'ECG_ARRHYTHMIA_DETECTION',
    responseTemplate: 'Pan-Tompkins QRS algorithm running on Core 1. R-R interval standard deviation is 42ms. Normal sinus rhythm detected at 72 BPM. No premature ventricular contractions (PVCs) identified in past 60 seconds.',
    actionCode: 'SAMPLE_ECG_LEAD_II',
    category: 'Medical',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'sys-01',
    triggerPattern: 'chip|hardware|specs|mcu|cpu|memory|sram|flash',
    intent: 'CHIP_DIAGNOSTICS',
    responseTemplate: 'ASSF Silicon Telemetry: Hardware Crypto Engine enabled (AES-256 + SHA-256). Active partition boot healthy. Brownout detector active at 2.7V threshold. 0 bad flash blocks detected.',
    actionCode: 'READ_NVS_HEALTH',
    category: 'General',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 11. B.TECH CORE ENGINEERING CURRICULUM
  // ==========================================
  {
    id: 'btech-os-01',
    triggerPattern: "banker's algorithm|bankers algorithm|deadlock|deadlock avoidance|coffman conditions|safe state",
    intent: 'BTECH_OS_DEADLOCK_AVOIDANCE',
    responseTemplate: `[ASSF B.TECH ENGINEERING: OPERATING SYSTEMS]
Banker's Algorithm & Deadlock Avoidance (Dijkstra):

1. The 4 Necessary Coffman Conditions for Deadlock:
   • Mutual Exclusion: At least one non-shareable resource.
   • Hold and Wait: A process holds ≥ 1 resource while requesting others.
   • No Preemption: Resources cannot be forcibly seized from a holding process.
   • Circular Wait: Closed chain of processes P0 -> P1 -> ... -> Pn -> P0.

2. Banker's Algorithm Data Structures:
   - Available[m]: Available instances of resource R_j.
   - Max[n][m]: Maximum demand of process P_i for resource R_j.
   - Allocation[n][m]: Currently allocated instances to P_i.
   - Need[n][m] = Max[n][m] - Allocation[n][m].

3. Safety Algorithm Execution:
   Step 1: Initialize Work = Available, Finish[i] = false for all i.
   Step 2: Find index i such that:
           Finish[i] == false AND Need[i] <= Work.
           If no such i exists, proceed to Step 4.
   Step 3: Work = Work + Allocation[i]; Finish[i] = true. Repeat Step 2.
   Step 4: If Finish[i] == true for all i, system is in a SAFE STATE; otherwise UNSAFE.

4. Concrete Exam Example:
   Suppose Available = [3, 3, 2]. If P1 needs [1, 2, 2] <= Available, grant request.
   When P1 finishes, its Allocation is reclaimed into Work: Work = [3, 3, 2] + Allocation[P1].
   Safe Sequence: <P1, P3, P4, P0, P2>.

GATE / University Takeaway: An unsafe state is NOT necessarily a deadlock; however, deadlock can ONLY occur from an unsafe state.`,
    actionCode: 'BTECH_OS_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-os-02',
    triggerPattern: 'cpu scheduling|round robin|srtf|paging|tlb|effective access time|page fault',
    intent: 'BTECH_OS_SCHEDULING_PAGING',
    responseTemplate: `[ASSF B.TECH ENGINEERING: OPERATING SYSTEMS]
CPU Scheduling & Virtual Memory Paging with TLB:

1. Effective Memory Access Time (EAT) with Translation Lookaside Buffer (TLB):
   Let:
   - α = TLB hit ratio (e.g. 0.90 or 90%)
   - t = TLB access time (e.g. 20 ns)
   - m = Main memory access time (e.g. 100 ns)

   Formula:
   EAT = α · (t + m) + (1 - α) · (t + 2m)
   Where:
   - On TLB Hit: TLB lookup (t) + Memory access for data (m) = t + m
   - On TLB Miss: TLB lookup (t) + Page table lookup (m) + Data access (m) = t + 2m
   Example: α = 0.95, t = 10ns, m = 100ns
   EAT = 0.95 · (110) + 0.05 · (210) = 104.5 + 10.5 = 115 ns.

2. CPU Scheduling Comparison:
   • FCFS: Non-preemptive, susceptible to Convoy Effect.
   • SJF / SRTF: Shortest Remaining Time First is provably optimal for minimizing Average Waiting Time.
   • Round Robin: Preemptive, time quantum q. If q is very large -> FCFS; if q is very small -> high context-switch overhead.`,
    actionCode: 'BTECH_OS_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-cn-01',
    triggerPattern: 'tcp 3-way handshake|tcp handshake|tcp vs udp|sliding window|go-back-n|selective repeat',
    intent: 'BTECH_NETWORKS_TRANSPORT',
    responseTemplate: `[ASSF B.TECH ENGINEERING: COMPUTER NETWORKS]
Transport Layer Protocols: TCP 3-Way Handshake & Sliding Window ARQ:

1. TCP 3-Way Connection Handshake:
   Client                          Server
     |--- SYN (seq = x) ------------->|  (Server enters SYN_RCVD)
     |<-- SYN-ACK (seq = y, ack = x+1)|  (Client enters ESTABLISHED)
     |--- ACK (seq = x+1, ack = y+1)->|  (Server enters ESTABLISHED)
   * Four-Way Termination: FIN -> ACK -> FIN -> ACK (with 2*MSL TIME_WAIT to flush duplicate packets).

2. Sliding Window Protocols Efficiency (a = T_prop / T_trans):
   • Stop-and-Wait: Efficiency η = 1 / (1 + 2a)
   • Go-Back-N (GBN):
     - Sender Window Size: W_s = N = 2^k - 1 (for k-bit sequence numbers)
     - Receiver Window Size: W_r = 1
     - Efficiency: η = min(1, N / (1 + 2a))
     - Discards out-of-order packets; retransmits entire window from lost frame.
   • Selective Repeat (SR):
     - W_s = W_r = 2^(k-1)
     - Retransmits only individual damaged/timed-out frames using negative ACK (NACK) or individual timers.

3. TCP vs UDP Summary:
   - TCP: Connection-oriented, Byte stream, Congestion/Flow control (AIMD, Slow Start), Overhead: 20-60 bytes.
   - UDP: Connectionless, Message stream, No retransmission, Minimal overhead: 8 bytes (DNS, VoIP, DHCP).`,
    actionCode: 'BTECH_NET_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-cn-02',
    triggerPattern: 'subnetting|cidr|subnet mask|network id|broadcast address|ip address calculation',
    intent: 'BTECH_NETWORKS_SUBNETTING',
    responseTemplate: `[ASSF B.TECH ENGINEERING: COMPUTER NETWORKS]
IPv4 CIDR Subnetting & Address Allocation:

Given IP block: 192.168.10.0 / 26
1. Subnet Mask:
   /26 means 26 bits set to 1, followed by 6 zeros:
   11111111.11111111.11111111.11000000 = 255.255.255.192

2. Block Size & Host Capacity:
   - Host bits h = 32 - 26 = 6 bits.
   - Total addresses per subnet = 2^h = 2^6 = 64 addresses.
   - Usable host addresses = 2^h - 2 = 64 - 2 = 62 (first is Network ID, last is Broadcast ID).

3. Subnet Decomposition (4 subnets of /26):
   Subnet 1:
   - Network ID: 192.168.10.0
   - Usable Hosts: 192.168.10.1 to 192.168.10.62
   - Directed Broadcast: 192.168.10.63
   Subnet 2:
   - Network ID: 192.168.10.64
   - Usable Hosts: 192.168.10.65 to 192.168.10.126
   - Directed Broadcast: 192.168.10.127`,
    actionCode: 'BTECH_NET_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-dbms-01',
    triggerPattern: 'normalization|1nf|2nf|3nf|bcnf|functional dependency|lossless join',
    intent: 'BTECH_DBMS_NORMALIZATION',
    responseTemplate: `[ASSF B.TECH ENGINEERING: DBMS]
Relational Database Normalization (1NF to BCNF):

1. First Normal Form (1NF):
   - Every column contains atomic (indivisible) values. No multi-valued or composite attributes.

2. Second Normal Form (2NF):
   - Must be in 1NF.
   - Eliminates Partial Dependency: Every non-prime attribute must be fully functionally dependent on every candidate key, not a proper subset of any candidate key.

3. Third Normal Form (3NF):
   - Must be in 2NF.
   - Eliminates Transitive Dependency. For every non-trivial functional dependency X -> Y:
     Either X is a Super Key OR Y is a Prime Attribute (member of some candidate key).

4. Boyce-Codd Normal Form (BCNF):
   - Stricter than 3NF.
   - For every non-trivial functional dependency X -> Y:
     X MUST be a Super Key (no exceptions for prime attributes).

5. Lossless Join & Dependency Preservation:
   - Decomposition of R into R1 and R2 is Lossless iff:
     (R1 ∩ R2) -> R1 OR (R1 ∩ R2) -> R2
   - BCNF always achieves lossless join, but may not always preserve all functional dependencies. 3NF guarantees both lossless join and dependency preservation.`,
    actionCode: 'BTECH_DBMS_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-dbms-02',
    triggerPattern: 'acid properties|two phase locking|2pl|serializability|transaction concurrency',
    intent: 'BTECH_DBMS_TRANSACTIONS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: DBMS]
ACID Properties & Concurrency Control (Two-Phase Locking - 2PL):

1. ACID Guarantees:
   • Atomicity: All or nothing execution (enforced via Undo log / Write-Ahead Logging WAL).
   • Consistency: Database transitions from one valid state to another satisfying all integrity constraints.
   • Isolation: Concurrent transactions execute as if running sequentially (enforced via Lock Manager / MVCC).
   • Durability: Committed updates persist across hardware failures (enforced via Redo log in non-volatile storage).

2. Two-Phase Locking (2PL) Protocol:
   - Growing Phase: Transaction acquires locks (Shared or Exclusive); no locks can be released.
   - Lock Point: Point when the last lock is acquired.
   - Shrinking Phase: Transaction releases locks; no new locks can be acquired.
   * Theorem: Basic 2PL guarantees Conflict Serializability.
   * Strict 2PL: All Exclusive locks held until COMMIT/ABORT (prevents Cascading Rollbacks).
   * Rigorous 2PL: ALL locks (Shared + Exclusive) held until transaction terminates.`,
    actionCode: 'BTECH_DBMS_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-toc-01',
    triggerPattern: 'pumping lemma|regular language|chomsky hierarchy|turing machine|context free grammar|dfa nfa',
    intent: 'BTECH_TOC_AUTOMATA',
    responseTemplate: `[ASSF B.TECH ENGINEERING: THEORY OF COMPUTATION]
Pumping Lemma for Regular Languages & Chomsky Hierarchy:

1. Formal Statement of Pumping Lemma:
   If L is a regular language, then there exists a pumping length p >= 1 such that any string s ∈ L with |s| >= p can be split into s = xyz satisfying:
   1. |y| >= 1 (y is non-empty)
   2. |xy| <= p
   3. For all i >= 0, x(y^i)z ∈ L

2. Classic Proof: Prove L = {a^n b^n | n >= 0} is NOT Regular:
   - Assume L is regular with pumping length p.
   - Choose string s = a^p b^p ∈ L. Note |s| = 2p >= p.
   - Since |xy| <= p, x and y must consist solely of 'a's: y = a^k where 1 <= k <= p.
   - Pump with i = 2: s' = x y^2 z = a^(p+k) b^p.
   - In s', number of 'a's (p+k) != number of 'b's (p).
   - Therefore s' ∉ L, contradicting the lemma. Hence L is NOT regular (L is Context-Free).

3. Chomsky Hierarchy:
   • Type-3 (Regular): Finite Automata (DFA/NFA) | Grammar: A -> aB or A -> a
   • Type-2 (Context-Free): Pushdown Automata (PDA) | Grammar: A -> α
   • Type-1 (Context-Sensitive): Linear Bounded Automata (LBA) | Grammar: αAβ -> αγβ
   • Type-0 (Unrestricted): Turing Machine (TM) | Halting Problem is Undecidable.`,
    actionCode: 'BTECH_TOC_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-coa-01',
    triggerPattern: 'pipelining|pipeline hazard|raw hazard|data hazard|amdahl|amdahl’s law|cache mapping',
    intent: 'BTECH_COA_ARCHITECTURE',
    responseTemplate: `[ASSF B.TECH ENGINEERING: COMPUTER ARCHITECTURE]
Instruction Pipelining, Hazards, and Amdahl's Law:

1. Classical 5-Stage RISC Pipeline:
   IF (Instruction Fetch) -> ID (Instruction Decode/Register Read) -> EX (Execute/ALU) -> MEM (Memory Access) -> WB (Write Back).
   Ideal Speedup: Speedup = (k · n) / (k + n - 1) ≈ k (as n -> ∞, where k = number of pipeline stages).

2. Pipeline Hazards & Mitigations:
   • Structural Hazard: Hardware resource conflict (e.g. unified memory accessed simultaneously for IF and MEM). Mitigation: Harvard architecture (separate I-Cache & D-Cache).
   • Data Hazards:
     - RAW (Read After Write - True Dependency): Solved with Operand Forwarding (Bypassing) or stalls (NOPs).
     - WAR (Write After Read - Anti-dependency) & WAW (Write After Write - Output dependency): Solved via Register Renaming.
   • Control Hazards: Branch instructions altering PC. Mitigation: Static/Dynamic Branch Predictor, Branch Delay Slots.

3. Amdahl's Law (Theoretical Speedup with Parallelism):
   S_overall = 1 / [ (1 - f) + (f / s) ]
   Where:
   - f = Fraction of program that is parallelizable
   - s = Speedup factor of the parallelized portion
   Takeaway: If 20% of code is sequential (1-f = 0.20), maximum possible speedup is 1/0.20 = 5x, even with infinite processor cores.`,
    actionCode: 'BTECH_COA_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-dld-01',
    triggerPattern: 'k-map|karnaugh map|sop pos|setup time|hold time|prime implicant|digital logic',
    intent: 'BTECH_DLD_DIGITAL_ELECTRONICS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: DIGITAL ELECTRONICS & VLSI]
Karnaugh Map (K-Map) 4-Variable Minimization & Sequential Timing:

1. 4-Variable K-Map Organization (Gray Code Ordering):
   Rows (AB): 00, 01, 11, 10
   Cols (CD): 00, 01, 11, 10
   - Grouping Rules: Group sizes must be powers of 2 (1, 2, 4, 8, 16).
   - Wrap-around allowed between edge columns (00 and 10) and edge rows (00 and 10).
   - Eliminate variables that change states (0 -> 1) across adjacent cells in the loop.
   - Essential Prime Implicant (EPI): A group containing at least one '1' not covered by any other prime implicant.

2. Flip-Flop Sequential Timing Constraints:
   • Setup Time (t_setup): Minimum time data input must remain stable BEFORE clock active edge.
   • Hold Time (t_hold): Minimum time data input must remain stable AFTER clock active edge.
   • Maximum Clock Frequency Calculation:
     T_clk >= t_cq(max) + t_comb(max) + t_setup
     f_max = 1 / T_clk
   • Hold Time Margin:
     t_cq(min) + t_comb(min) >= t_hold  (prevents race conditions / metastability).`,
    actionCode: 'BTECH_DLD_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-ctrl-01',
    triggerPattern: 'routh hurwitz|bode plot|gain margin|phase margin|control systems|transfer function',
    intent: 'BTECH_CONTROL_SYSTEMS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: CONTROL SYSTEMS]
Routh-Hurwitz Stability Criterion & Frequency Domain Stability Margins:

1. Routh-Hurwitz Criterion:
   For characteristic equation: a_n s^n + a_(n-1) s^(n-1) + ... + a_1 s + a_0 = 0.
   Construct Routh Array:
   s^n     | a_n       a_(n-2)     a_(n-4) ...
   s^(n-1) | a_(n-1)   a_(n-3)     a_(n-5) ...
   s^(n-2) | b_1       b_2         ...
   Where b_1 = (a_(n-1)·a_(n-2) - a_n·a_(n-3)) / a_(n-1).
   * Stability Theorem: A system is stable iff ALL elements in the FIRST column have the SAME sign.
   * Number of sign changes in first column = Number of poles in Right Half of s-plane (RHP).

2. Frequency Domain Stability (Bode Plot):
   • Gain Crossover Frequency (ω_gc): Frequency where |G(jω)H(jω)| = 1 (0 dB).
   • Phase Crossover Frequency (ω_pc): Frequency where ∠G(jω)H(jω) = -180°.
   • Phase Margin (PM): PM = 180° + ∠G(jω_gc)H(jω_gc).
   • Gain Margin (GM): GM = -20 log10 |G(jω_pc)H(jω_pc)| dB.
   * System Stability:
     Stable if ω_gc < ω_pc  <=>  PM > 0 and GM > 0 dB.
     Marginally Stable if ω_gc = ω_pc  <=>  PM = 0, GM = 0 dB.
     Unstable if ω_gc > ω_pc  <=>  PM < 0, GM < 0 dB.`,
    actionCode: 'BTECH_CONTROL_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-analog-01',
    triggerPattern: 'op-amp|operational amplifier|cmrr|slew rate|virtual ground|inverting amplifier',
    intent: 'BTECH_ANALOG_OPAMPS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: ANALOG ELECTRONICS]
Operational Amplifiers (Op-Amps) & Key Specifications:

1. Ideal Op-Amp Characteristics:
   - Open Loop Gain: A_OL = ∞
   - Input Impedance: R_in = ∞ (Input bias currents I_b+ = I_b- = 0 A)
   - Output Impedance: R_out = 0 Ω
   - Bandwidth: BW = ∞
   - Common Mode Rejection Ratio: CMRR = ∞
   - Slew Rate: SR = ∞

2. Concept of Virtual Short / Virtual Ground:
   Since V_out = A_OL · (V+ - V-) and V_out is finite (bounded by supply rails ±V_sat),
   as A_OL -> ∞, (V+ - V-) = V_out / A_OL -> 0 V. Therefore V+ ≈ V-.
   When non-inverting terminal is grounded (V+ = 0V), inverting terminal acts as Virtual Ground.

3. Core Topologies:
   • Inverting Amplifier: V_out = -(R_f / R_1) · V_in
   • Non-Inverting Amplifier: V_out = (1 + R_f / R_1) · V_in
   • Common Mode Rejection Ratio: CMRR = 20 log10 (|A_d / A_c|) dB.
   • Slew Rate (Maximum rate of change of output voltage): SR = max |dV_out / dt| (typically V/µs). For full-power distortionless sine wave: f_max = SR / (2π · V_peak).`,
    actionCode: 'BTECH_ANALOG_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-sig-01',
    triggerPattern: 'convolution|laplace transform|z-transform|fourier transform|roc|lti system',
    intent: 'BTECH_SIGNALS_SYSTEMS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: SIGNALS & SYSTEMS]
LTI Systems, Convolution Integral, and Laplace Transform:

1. Continuous-Time Convolution Integral:
   Output of an LTI system with impulse response h(t) excited by input x(t):
   y(t) = x(t) * h(t) = ∫_{-∞}^{+∞} x(τ) · h(t - τ) dτ
   Properties: Commutative, Associative, Distributive, Convolution with impulse: x(t) * δ(t - t0) = x(t - t0).

2. Unilateral Laplace Transform & Region of Convergence (ROC):
   X(s) = ∫_{0^-}^{+∞} x(t) · e^(-st) dt, where complex frequency s = σ + jω.
   • System Stability: An LTI system is BIBO (Bounded-Input Bounded-Output) stable iff the ROC of its transfer function H(s) includes the imaginary jω-axis.
   • Causality: For a causal system, ROC is a right-half plane: Re{s} > σ_max (to the right of the rightmost pole).

3. Discrete-Time Z-Transform:
   X(z) = ∑_{n=-∞}^{+∞} x[n] · z^(-n).
   Causal DT system is stable iff ALL poles lie STRICTLY INSIDE the unit circle (|z| < 1).`,
    actionCode: 'BTECH_SIG_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-mech-01',
    triggerPattern: "mohr's circle|mohrs circle|principal stress|shear stress|stress strain|strength of materials",
    intent: 'BTECH_MECH_STRENGTH_MATERIALS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: MECHANICAL & CIVIL]
Mohr's Circle for 2D Plane Stress & Principal Stresses:

1. Analytical Transformation Equations:
   Given normal stresses σ_x, σ_y and shear stress τ_xy on orthogonal planes:
   • Principal Stresses (planes of zero shear stress):
     σ_(1,2) = (σ_x + σ_y) / 2 ± √[ ((σ_x - σ_y) / 2)² + τ_xy² ]
   • Maximum In-Plane Shear Stress:
     τ_max = √[ ((σ_x - σ_y) / 2)² + τ_xy² ] = (σ_1 - σ_2) / 2
   • Principal Plane Angle θ_p:
     tan(2θ_p) = (2 · τ_xy) / (σ_x - σ_y)

2. Geometric Construction of Mohr's Circle:
   - Center Coordinate: C = ( (σ_x + σ_y) / 2, 0 )
   - Radius of Circle: R = τ_max = √[ ((σ_x - σ_y) / 2)² + τ_xy² ]
   - Major Principal Stress σ_1 = Center + R
   - Minor Principal Stress σ_2 = Center - R
   Takeaway: The planes of maximum shear stress are oriented at 45° to the principal stress planes.`,
    actionCode: 'BTECH_MECH_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-fluid-01',
    triggerPattern: 'bernoulli|venturi meter|reynolds number|navier-stokes|fluid mechanics|continuity equation',
    intent: 'BTECH_FLUID_MECHANICS',
    responseTemplate: `[ASSF B.TECH ENGINEERING: FLUID MECHANICS]
Bernoulli's Equation & Flow Measurement (Venturi Meter):

1. Bernoulli's Equation along a Streamline (Incompressible, Inviscid, Steady Flow):
   P / (ρ · g) + v² / (2 · g) + z = Constant (Total Head H)
   Where:
   - P / (ρ · g) = Pressure Head
   - v² / (2 · g) = Velocity / Dynamic Head
   - z = Datum / Potential Head

2. Venturi Meter Mass Flow Rate Derivation:
   Applying Continuity Equation A1·v1 = A2·v2 and Bernoulli between inlet (1) and throat (2):
   v2 = √[ (2 · (P1 - P2) / ρ) / (1 - (A2/A1)²) ]
   Actual Discharge Q_act:
   Q_act = C_d · [ (A1 · A2) / √(A1² - A2²) ] · √(2 · g · h)
   Where C_d ≈ 0.96 - 0.98 (coefficient of discharge), h = differential pressure head.

3. Flow Regimes (Reynolds Number Re = ρ·v·D / μ):
   - Re < 2000: Laminar flow (viscous forces dominate).
   - 2000 < Re < 4000: Transition zone.
   - Re > 4000: Turbulent flow (inertial forces dominate, eddy diffusion).`,
    actionCode: 'BTECH_FLUID_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-math-01',
    triggerPattern: 'master theorem|recurrence relation|divide and conquer|time complexity recurrence',
    intent: 'BTECH_MATH_MASTER_THEOREM',
    responseTemplate: `[ASSF B.TECH ENGINEERING: ALGORITHMS & MATHEMATICS]
Master Theorem for Divide-and-Conquer Recurrences:

General Recurrence Form:
T(n) = a · T(n / b) + f(n)
Where a >= 1, b > 1, and f(n) is asymptotically positive (often f(n) = Θ(n^k · log^p n)).

Compare f(n) with critical exponent function n^(log_b a):
• Case 1: If f(n) = O(n^(log_b a - ε)) for some ε > 0:
  => T(n) = Θ(n^(log_b a))   [Root cost dominated by leaves]
  Example: T(n) = 8T(n/2) + 1000n² -> a=8, b=2 => n^(log_2 8) = n³. Since n² = O(n^(3-1)), T(n) = Θ(n³).

• Case 2: If f(n) = Θ(n^(log_b a) · log^k n) where k >= 0:
  => T(n) = Θ(n^(log_b a) · log^(k+1) n)   [Cost evenly distributed across all levels]
  Example: Merge Sort T(n) = 2T(n/2) + n -> a=2, b=2 => n^(log_2 2) = n^1. f(n) = n·log^0 n.
  => T(n) = Θ(n · log n).

• Case 3: If f(n) = Ω(n^(log_b a + ε)) for some ε > 0 and regularity condition a·f(n/b) <= c·f(n) holds for c < 1:
  => T(n) = Θ(f(n))   [Cost dominated by the root]
  Example: T(n) = 2T(n/2) + n² -> a=2, b=2 => n^1. Since n² = Ω(n^(1+1)), T(n) = Θ(n²).`,
    actionCode: 'BTECH_MATH_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },
  {
    id: 'btech-math-02',
    triggerPattern: 'cayley-hamilton|cayley hamilton theorem|characteristic equation|matrix inverse|eigenvalues',
    intent: 'BTECH_MATH_CAYLEY_HAMILTON',
    responseTemplate: `[ASSF B.TECH ENGINEERING: LINEAR ALGEBRA]
Cayley-Hamilton Theorem & Matrix Operations:

1. Theorem Statement:
   Every square matrix A of size n × n satisfies its own characteristic equation:
   p(λ) = det(A - λ · I) = 0
   If p(λ) = (-1)^n · [ λ^n + c_(n-1)·λ^(n-1) + ... + c_1·λ + c_0 ] = 0,
   Then replacing scalar λ with matrix A yields:
   A^n + c_(n-1)·A^(n-1) + ... + c_1·A + c_0·I = O (Null Matrix).

2. Computing Matrix Inverse (A^(-1)):
   Provided det(A) = (-1)^n · c_0 != 0:
   Multiply both sides by A^(-1):
   A^(n-1) + c_(n-1)·A^(n-2) + ... + c_1·I + c_0·A^(-1) = O
   => A^(-1) = - (1 / c_0) · [ A^(n-1) + c_(n-1)·A^(n-2) + ... + c_1·I ].

3. Computing Higher Powers (A^m for m >> n):
   Divide λ^m by p(λ): λ^m = q(λ)·p(λ) + r(λ), where degree of remainder r(λ) < n.
   Since p(A) = O:
   A^m = r(A)
   Allows calculating A^100 of a 2x2 matrix with just linear combination A^100 = α·A + β·I.`,
    actionCode: 'BTECH_MATH_ANALYSIS',
    category: 'B.Tech',
    addedInVersion: 'v1.0.0',
  },

  // ==========================================
  // 10. 2026+ ADVANCED & EMERGING TECHNOLOGY
  // ==========================================
  {
    id: 'tech-2026-01',
    triggerPattern: 'mcp|model context protocol|agentic ai|ai agents|tool calling|multi-agent|rag',
    intent: 'TECH_AGENTIC_AI_MCP',
    responseTemplate: `Agentic AI & Model Context Protocol (MCP):
• Agentic Architecture: Modern AI agents pair reasoning models with structured tool-calling loops (Plan → Execute Tool → Observe → Verify) and deterministic policy guardrails rather than single-shot text generation.
• Model Context Protocol (MCP): Open client-server JSON-RPC standard that exposes Resources (read data), Tools (executable actions), and Prompts through a uniform interface so any AI assistant connects cleanly to databases, APIs, and hardware devices.
• Hybrid Retrieval (RAG): Combines dense semantic vector search with lexical BM25 + reranking to ground responses in verified documents and live telemetry.`,
    actionCode: 'TECH_AI_ARCHITECTURE',
    category: 'Engineering',
    addedInVersion: 'v1.3.0',
  },
  {
    id: 'tech-2026-02',
    triggerPattern: 'edge npu|tinyml|int4|int8 quantization|lora|qlora|neural-art|ethos-u|riscv vector|rvv',
    intent: 'TECH_EDGE_NPU_QUANTIZATION',
    responseTemplate: `Edge NPUs, TinyML & Low-Bit Quantization:
• INT8 / INT4 Quantization: Compresses FP32 neural weights by 4×–8× with <1% accuracy drop using post-training calibration (PTQ) or quantization-aware training (QAT), fitting vision and keyword models inside microcontroller SRAM.
• Modern Edge Silicon: Next-gen MCUs combine Arm Cortex-M55 Helium MVE / Dual RISC-V Vector (RVV 1.0) cores with dedicated NPUs (e.g., ST Neural-ART 600 GOPS, Arm Ethos-U85, ESP32-P4 PIE) for sub-10ms on-device inference at <150 mW.`,
    actionCode: 'TECH_EDGE_SILICON',
    category: 'Engineering',
    addedInVersion: 'v1.3.0',
  },
  {
    id: 'tech-2026-03',
    triggerPattern: 'post-quantum|pqc|ml-kem|kyber|ml-dsa|dilithium|fips 203|fips 204|quantum cryptography',
    intent: 'TECH_POST_QUANTUM_SECURITY',
    responseTemplate: `Post-Quantum Cryptography (NIST FIPS 203 / 204 / 205):
• ML-KEM (FIPS 203, formerly Kyber): Lattice-based key encapsulation mechanism replacing RSA/ECDH key exchange against Shor's algorithm quantum attacks.
• ML-DSA (FIPS 204, formerly Dilithium) & SLH-DSA (FIPS 205): Quantum-resistant digital signatures used to sign firmware bootloaders and OTA updates.
• Edge Best Practice: Use hybrid X25519 + ML-KEM-768 TLS handshakes and verify ML-DSA firmware manifests before swapping A/B flash partitions.`,
    actionCode: 'TECH_PQC_SECURITY',
    category: 'Engineering',
    addedInVersion: 'v1.3.0',
  },
  {
    id: 'tech-2026-04',
    triggerPattern: 'wifi 7|wi-fi 7|802.11be|mlo|matter 1.4|thread 1.4|smart home standard',
    intent: 'TECH_WIFI7_MATTER14',
    responseTemplate: `Wi-Fi 7 (IEEE 802.11be), Matter 1.4 & Thread 1.4:
• Wi-Fi 7: Introduces 320 MHz ultra-wide channels, 4096-QAM modulation, and Multi-Link Operation (MLO) that aggregates or fails over across 2.4 / 5 / 6 GHz bands for <2 ms deterministic latency.
• Matter 1.4 & Thread 1.4: Unifies smart home ecosystems locally over IPv6 mesh with Enhanced Multi-Admin, energy management clusters (EVSE, heat pumps, solar inverters, batteries), and unified Thread credential sharing.`,
    actionCode: 'TECH_WIRELESS_STANDARDS',
    category: 'Engineering',
    addedInVersion: 'v1.3.0',
  },
  {
    id: 'tech-2026-05',
    triggerPattern: 'embedded rust|embassy|free-threaded python|nogil|python 3.13|python 3.14|java 21 virtual threads',
    intent: 'TECH_MODERN_LANGUAGES',
    responseTemplate: `Modern Systems & Application Language Advances:
• Free-Threaded Python (3.13t / 3.14t): Experimental/optional removal of the Global Interpreter Lock (PEP 703) enables true multi-core CPU parallelism across threads alongside a Tier-2 JIT compiler.
• Embedded Rust (Embassy): Compile-time memory/data-race safety with zero-cost async/await task scheduling directly on bare-metal Cortex-M and RISC-V microcontrollers without a heavy RTOS.
• Java 21+ Virtual Threads & C++23: Lightweight M:N virtual threads scale millions of concurrent I/O tasks, while C++23 adds std::expected, std::print, and flat_map for safer low-latency systems.`,
    actionCode: 'TECH_MODERN_LANGUAGES',
    category: 'Engineering',
    addedInVersion: 'v1.3.0',
  },
  {
    id: 'tech-2026-06',
    triggerPattern: 'gan|sic|silicon carbide|gallium nitride|solid-state battery|solid state battery|v2g|bms',
    intent: 'TECH_POWER_ELECTRONICS_EV',
    responseTemplate: `Wide-Bandgap Power Electronics (SiC/GaN) & Next-Gen BMS:
• SiC & GaN FETs: Replace silicon MOSFETs/IGBTs in inverters and fast chargers; GaN enables MHz switching (shrinking magnetics by 60%), while SiC excels at >800V EV traction and solar inverters with lower switching losses.
• Solid-State & LFP Battery Management (BMS): Uses solid ceramic/sulfide electrolytes for >400 Wh/kg energy density and lower thermal runaway risk, paired with AI Kalman-filter State-of-Health (SoH) and bidirectional V2G (ISO 15118-20) grid discharge.`,
    actionCode: 'TECH_POWER_BMS',
    category: 'Engineering',
    addedInVersion: 'v1.3.0',
  },
  {
    id: 'tech-2026-07',
    triggerPattern: 'industry 5.0|opc-ua|tsn|time-sensitive networking|digital twin|predictive maintenance',
    intent: 'TECH_INDUSTRY50_TSN',
    responseTemplate: `Industry 5.0, OPC-UA over TSN & Digital Twins:
• Time-Sensitive Networking (IEEE 802.1 TSN): Guarantees bounded microsecond Ethernet latency and deterministic packet scheduling for synchronized robotics, PLC loops, and vision inspection.
• OPC-UA FX + Digital Twins: Combines vendor-neutral semantic machine data models with live physics + AI anomaly twins to predict bearing spalling, thermal drift, and energy waste before unplanned downtime occurs.`,
    actionCode: 'TECH_INDUSTRY_50',
    category: 'Industrial',
    addedInVersion: 'v1.3.0',
  },
];

export class EdgeInferenceEngine {
  private knowledgeBank: KnowledgeItem[] = [];
  private currentVersion: string = 'v1.0.0';
  private targetChip: ChipSpec;

  constructor(chip: ChipSpec) {
    this.targetChip = chip;
    this.loadState();
  }

  public setTargetChip(chip: ChipSpec) {
    this.targetChip = chip;
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  public getKnowledgeBank(): KnowledgeItem[] {
    return [...this.knowledgeBank];
  }

  private loadState() {
    if (typeof window !== 'undefined') {
      try {
        const savedKnowledge = localStorage.getItem('assf_knowledge_bank') || localStorage.getItem('microedge_knowledge_bank');
        const savedVersion = localStorage.getItem('assf_active_version') || localStorage.getItem('microedge_active_version');
        if (savedKnowledge) {
          const parsed = JSON.parse(savedKnowledge);
          // If the cached knowledge has fewer items than current factory knowledge, merge in new factory entries
          if (Array.isArray(parsed) && parsed.length >= FACTORY_KNOWLEDGE.length) {
            this.knowledgeBank = parsed;
          } else {
            // Merge to preserve newly added polyglot knowledge
            const existingIds = new Set(parsed.map((p: any) => p.id));
            const missing = FACTORY_KNOWLEDGE.filter((f) => !existingIds.has(f.id));
            this.knowledgeBank = [...parsed, ...missing];
          }
        } else {
          this.knowledgeBank = [...FACTORY_KNOWLEDGE];
        }
        if (savedVersion) {
          this.currentVersion = savedVersion;
        }
      } catch {
        this.knowledgeBank = [...FACTORY_KNOWLEDGE];
      }
    } else {
      this.knowledgeBank = [...FACTORY_KNOWLEDGE];
    }
  }

  public saveState() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('assf_knowledge_bank', JSON.stringify(this.knowledgeBank));
        localStorage.setItem('assf_active_version', this.currentVersion);
      } catch {
        // Storage full or unavailable
      }
    }
  }

  // Hot-apply OTA delta patch onto the running offline engine
  public applyOtaPatch(newVersion: string, deltaItems: Array<Partial<KnowledgeItem>>) {
    deltaItems.forEach((delta) => {
      if (delta.id && delta.triggerPattern && delta.responseTemplate) {
        const existingIdx = this.knowledgeBank.findIndex((k) => k.id === delta.id);
        const completeItem: KnowledgeItem = {
          id: delta.id,
          triggerPattern: delta.triggerPattern,
          intent: delta.intent || 'DYNAMIC_OTA_INTENT',
          responseTemplate: delta.responseTemplate,
          actionCode: delta.actionCode || 'NO_ACTION',
          category: (delta.category as any) || 'General',
          addedInVersion: newVersion,
        };

        if (existingIdx >= 0) {
          this.knowledgeBank[existingIdx] = completeItem;
        } else {
          this.knowledgeBank.unshift(completeItem);
        }
      }
    });

    this.currentVersion = newVersion;
    this.saveState();
  }

  // Directly store a newly solved doubt into on-chip flash knowledge
  public addDistilledKnowledge(item: { trigger: string; intent?: string; response: string; category?: string }) {
    const newItem: KnowledgeItem = {
      id: `distill-${Date.now()}`,
      triggerPattern: item.trigger.toLowerCase(),
      intent: item.intent || 'USER_SOLVE_CACHE',
      responseTemplate: item.response,
      actionCode: 'NO_ACTION',
      category: (item.category as any) || 'General',
      addedInVersion: this.currentVersion,
    };
    this.knowledgeBank.unshift(newItem);
    this.saveState();
  }

  // Directly add or update an arbitrary structured knowledge item or idea
  public addKnowledgeItem(item: KnowledgeItem) {
    const existingIdx = this.knowledgeBank.findIndex((k) => k.id === item.id);
    if (existingIdx >= 0) {
      this.knowledgeBank[existingIdx] = item;
    } else {
      this.knowledgeBank.unshift(item);
    }
    this.saveState();
  }

  // Reset to factory defaults
  public factoryReset() {
    this.knowledgeBank = [...FACTORY_KNOWLEDGE];
    this.currentVersion = 'v1.0.0';
    this.saveState();
  }

  // Procedural Polyglot Synthesizer: Generates clean code only when code is requested
  private generatePythonSolution(): string {
    return `\`\`\`python
from typing import List, Dict, Any
import time

class SolutionEngine:
    def __init__(self, debug: bool = False):
        self.debug = debug
        self.history: List[Dict[str, Any]] = []

    def execute(self, payload: Any) -> Dict[str, Any]:
        start_ns = time.perf_counter_ns()
        try:
            if isinstance(payload, (list, tuple)):
                result = [x * 2 if isinstance(x, (int, float)) else str(x) for x in payload]
            elif isinstance(payload, str):
                result = payload.strip().title()
            else:
                result = {"status": "processed", "raw": payload}

            elapsed_us = (time.perf_counter_ns() - start_ns) / 1000
            response = {
                "success": True,
                "result": result,
                "latency_us": round(elapsed_us, 2)
            }
            self.history.append(response)
            return response
        except Exception as err:
            return {"success": False, "error": str(err)}
\`\`\``;
  }

  private generateJavaSolution(): string {
    return `\`\`\`java
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.Collectors;

public class AssfJavaSolver {
    public record ExecutionRecord(long timestamp, String status, List<Integer> processedData) {}

    public static class TaskProcessor {
        private final List<ExecutionRecord> auditLog = new CopyOnWriteArrayList<>();

        public ExecutionRecord processItems(List<Integer> input) {
            Objects.requireNonNull(input, "Input list cannot be null");
            List<Integer> transformed = input.stream()
                .filter(Objects::nonNull)
                .filter(n -> n % 2 == 0)
                .map(n -> n * n)
                .sorted()
                .collect(Collectors.toUnmodifiableList());

            ExecutionRecord record = new ExecutionRecord(System.currentTimeMillis(), "COMPLETED", transformed);
            auditLog.add(record);
            return record;
        }
    }
}
\`\`\``;
  }

  private generateCppSolution(): string {
    const chip = this.targetChip;
    return `\`\`\`cpp
#include <vector>
#include <algorithm>
#include <cstdint>
#include <span>

// Zero-allocation C++20 buffer calibrated for ${chip.name}
template <typename T>
class DeterministicBuffer {
public:
    explicit DeterministicBuffer(size_t capacity) : capacity_(capacity) {
        data_.reserve(capacity);
    }

    bool push(T value) noexcept {
        if (data_.size() >= capacity_) return false;
        data_.push_back(std::move(value));
        return true;
    }

    [[nodiscard]] std::span<const T> view() const noexcept {
        return std::span<const T>(data_.data(), data_.size());
    }

    void sort_ascending() noexcept {
        std::sort(data_.begin(), data_.end());
    }

private:
    size_t capacity_;
    std::vector<T> data_;
};
\`\`\``;
  }

  // Dedicated B.Tech Academic & Competitive Engineering Answer (Direct, no question echo, no unrequested code)
  private generateBTechSolution(_query: string): string {
    const chip = this.targetChip;
    return `1. Core Principle: Apply standard governing equations (conservation laws, Kirchhoff's laws, relational dependencies, or state-space stability criteria) using consistent SI units.
2. Method:
   - Identify boundary conditions and known parameters.
   - Substitute into the closed-form equation or characteristic polynomial.
   - Verify stability/validity bounds (e.g., LHP poles for continuous systems, unit circle for discrete, or safe sequence in resource graphs).
3. Hardware Note: Evaluable directly on ${chip.name} ALU/FPU (~${(chip.clockMhz * 0.035).toFixed(0)} cycles).`;
  }

  // General Offline Direct Answer Solver
  private solveOfflineGeneralDoubt(cleanQuery: string): string {
    const chip = this.targetChip;

    // 1. Exact arithmetic / scientific math first (direct numerical answer)
    const mathEval = this.evaluateExactMath(cleanQuery);
    if (mathEval) {
      return `${mathEval.result}`;
    }

    // 2. Direct built-in scientific & everyday facts (concise, accurate, zero fluff)
    const quickFacts: { keys: string[]; answer: string }[] = [
      { keys: ['ohm', 'v=ir', 'voltage current resistance'], answer: "Ohm's Law: V = I × R (Voltage = Current × Resistance). Also P = V × I = I²R." },
      { keys: ['speed of light'], answer: 'The speed of light in vacuum (c) is exactly 299,792,458 m/s (≈ 3.0 × 10⁸ m/s).' },
      { keys: ['gravity', 'acceleration due to gravity'], answer: 'Standard Earth gravitational acceleration (g) is 9.80665 m/s² (≈ 9.81 m/s²).' },
      { keys: ['boiling point of water'], answer: 'Pure water boils at 100°C (212°F or 373.15 K) at standard 1 atm sea-level pressure.' },
      { keys: ['freezing point of water'], answer: 'Pure water freezes at 0°C (32°F or 273.15 K) at standard 1 atm pressure.' },
      { keys: ['pi value', 'value of pi'], answer: 'π ≈ 3.141592653589793.' },
      { keys: ['pythagoras', 'pythagorean'], answer: 'Pythagorean Theorem: a² + b² = c² for a right-angled triangle with hypotenuse c.' },
      { keys: ['quadratic formula'], answer: 'For ax² + bx + c = 0, the roots are x = (-b ± √(b² - 4ac)) / (2a).' },
      { keys: ['newton first law', "newton's first law"], answer: "Newton's 1st Law (Inertia): An object stays at rest or in uniform straight-line motion unless acted upon by a net external force." },
      { keys: ['newton second law', "newton's second law", 'f=ma'], answer: "Newton's 2nd Law: F = m × a (Net Force equals mass times acceleration)." },
      { keys: ['newton third law', "newton's third law"], answer: "Newton's 3rd Law: Every action has an equal and opposite reaction." },
      { keys: ['tcp vs udp', 'udp vs tcp'], answer: 'TCP is connection-oriented, reliable, and ordered (handshake + retransmissions). UDP is connectionless, faster, and low-overhead without guaranteed delivery.' },
      { keys: ['osi layers', '7 layers'], answer: 'The 7 OSI layers (bottom to top): 1. Physical, 2. Data Link, 3. Network, 4. Transport, 5. Session, 6. Presentation, 7. Application.' },
      { keys: ['http 404', '404 error'], answer: 'HTTP 404 means "Not Found" — the server is reachable, but the requested URL or resource does not exist.' },
      { keys: ['http 500', '500 error'], answer: 'HTTP 500 means "Internal Server Error" — an unexpected failure occurred on the server while processing the request.' },
      { keys: ['photosynthesis'], answer: 'Photosynthesis converts CO₂ + H₂O + sunlight into glucose (C₆H₁₂O₆) and oxygen (6O₂) inside plant chloroplasts.' },
      {
        keys: ['who created', 'who made', 'who built', 'who developed', 'who owns', 'created by', 'made by', 'your creator', 'your founder', 'powered by'],
        answer: 'ASSF was created by Fahadsha and ASSF Technology, powered by Gemini Argon.',
      },
    ];

    for (const fact of quickFacts) {
      if (fact.keys.some((k) => cleanQuery.includes(k))) {
        return fact.answer;
      }
    }

    // 3. Only return code when the user explicitly asks for code/program/script/example
    const asksForCode = /\b(code|program|script|write|implement|example|snippet|syntax|function|class)\b/i.test(cleanQuery);

    if (cleanQuery.includes('python') || cleanQuery.includes('django') || cleanQuery.includes('fastapi') || cleanQuery.includes('flask') || cleanQuery.includes('numpy') || cleanQuery.includes('pandas') || cleanQuery.includes('.py')) {
      return asksForCode
        ? this.generatePythonSolution()
        : 'Python is a high-level, dynamically typed, interpreted language known for readable syntax, rapid prototyping, data science (NumPy/Pandas), backend APIs (FastAPI/Django), and AI/automation.';
    }

    if (cleanQuery.includes('java') || cleanQuery.includes('spring') || cleanQuery.includes('jvm') || cleanQuery.includes('jdk') || cleanQuery.includes('maven') || cleanQuery.includes('gradle')) {
      return asksForCode
        ? this.generateJavaSolution()
        : 'Java is a statically typed, object-oriented language compiled to bytecode that runs on the Java Virtual Machine (JVM), providing platform independence, automatic garbage collection, and strong concurrency support.';
    }

    if (cleanQuery.includes('c++') || cleanQuery.includes('cpp') || cleanQuery.includes('pointer') || cleanQuery.includes('template') || cleanQuery.includes('vector') || cleanQuery.includes('stl')) {
      return asksForCode
        ? this.generateCppSolution()
        : 'C++ is a compiled, statically typed systems language offering deterministic memory control (RAII/smart pointers), zero-overhead abstractions, templates, and direct hardware/embedded performance.';
    }

    // 4. B.Tech engineering concepts (without repeating question or injecting code)
    if (
      cleanQuery.includes('b.tech') ||
      cleanQuery.includes('btech') ||
      cleanQuery.includes('gate') ||
      cleanQuery.includes('deadlock') ||
      cleanQuery.includes('banker') ||
      cleanQuery.includes('scheduling') ||
      cleanQuery.includes('paging') ||
      cleanQuery.includes('tlb') ||
      cleanQuery.includes('subnet') ||
      cleanQuery.includes('cidr') ||
      cleanQuery.includes('normalization') ||
      cleanQuery.includes('bcnf') ||
      cleanQuery.includes('pumping lemma') ||
      cleanQuery.includes('k-map') ||
      cleanQuery.includes('karnaugh') ||
      cleanQuery.includes('routh') ||
      cleanQuery.includes('bode') ||
      cleanQuery.includes('op-amp') ||
      cleanQuery.includes('laplace') ||
      cleanQuery.includes('z-transform') ||
      cleanQuery.includes('mohr') ||
      cleanQuery.includes('bernoulli') ||
      cleanQuery.includes('navier') ||
      cleanQuery.includes('reynolds') ||
      cleanQuery.includes('master theorem') ||
      cleanQuery.includes('eigenvalue')
    ) {
      return this.generateBTechSolution(cleanQuery);
    }

    // 5. Hardware & circuit checks (no question echo)
    if (cleanQuery.includes('circuit') || cleanQuery.includes('sensor') || cleanQuery.includes('voltage') || cleanQuery.includes('amp') || cleanQuery.includes('i2c') || cleanQuery.includes('spi') || cleanQuery.includes('pwm')) {
      return `1. Logic & Bus: Verify 3.3V CMOS levels for ${chip.name} GPIO (use a level shifter for 5V signals) and 4.7 kΩ pull-up resistors on I2C lines.
2. Power Filtering: Place a 100 nF ceramic capacitor close to VDD plus a 10 µF bulk capacitor to prevent brownouts during wireless bursts.`;
    }

    // 6. Concise fallback for unrecognized offline open-ended questions
    return `This open-ended question requires Gateway Connected mode for a complete, verified answer in your chosen language. Click "AIR-GAPPED OFFLINE" in the top bar to switch to Gateway Connected mode, or enter a math expression directly for an immediate offline result.`;
  }

  private evaluateExactMath(query: string): { expression: string; result: number } | null {
    const cleaned = query
      .toLowerCase()
      .replace(/^(what is|calculate|compute|solve|evaluate|=)\s+/i, '')
      .replace(/[?？]/g, '')
      .trim();

    if (!/[0-9]/.test(cleaned) || !/[+\-*/^]|sqrt|sin|cos|tan|log|ln/.test(cleaned)) {
      return null;
    }

    const exprMatch = cleaned.match(/[0-9a-z.\s+\-*/^()%]+/);
    if (!exprMatch) return null;
    const rawExpr = exprMatch[0].trim();

    const tokens = rawExpr.match(/[a-z]+/g) || [];
    const allowedFns = new Set(['sqrt', 'sin', 'cos', 'tan', 'abs', 'log', 'ln', 'pi', 'e', 'pow']);
    if (tokens.some((t) => !allowedFns.has(t))) {
      return null;
    }

    try {
      const jsExpr = rawExpr
        .replace(/\^/g, '**')
        .replace(/\bpi\b/g, 'Math.PI')
        .replace(/\be\b/g, 'Math.E')
        .replace(/\bsqrt\(/g, 'Math.sqrt(')
        .replace(/\bsin\(/g, 'Math.sin(')
        .replace(/\bcos\(/g, 'Math.cos(')
        .replace(/\btan\(/g, 'Math.tan(')
        .replace(/\babs\(/g, 'Math.abs(')
        .replace(/\blog\(/g, 'Math.log10(')
        .replace(/\bln\(/g, 'Math.log(');

      if (!/^[0-9+\-*/().,\sMathPICEsqrtincolaeb]+$/.test(jsExpr)) {
        return null;
      }

      const fn = new Function(`"use strict"; return (${jsExpr});`);
      const value = fn();
      if (typeof value === 'number' && Number.isFinite(value)) {
        return { expression: rawExpr, result: +value.toFixed(6) };
      }
    } catch {
      return null;
    }
    return null;
  }

  // Purely OFFLINE local inference executing directly in the client
  public runOfflineInference(
    query: string,
    image?: string,
    _options?: { subAiName?: string; memberName?: string; languageLabel?: string }
  ): { responseText: string; telemetry: InferenceTelemetry } {
    const cleanQuery = query.toLowerCase().trim();

    // 1. Check for numeric variables (temperatures, vibrations, voltages, heart rates)
    const numbersFound = query.match(/[-+]?[0-9]*\.?[0-9]+/g);
    let numericContext = '';
    if (numbersFound && numbersFound.length > 0) {
      const val = parseFloat(numbersFound[0]);
      if (cleanQuery.includes('deg') || cleanQuery.includes('°c') || cleanQuery.includes('celsius')) {
        if (val > 80) {
          numericContext = ` [CRITICAL THERMAL DETECTED: ${val}°C > 80°C SAFE LIMIT. TRIP IMMINENT.]`;
        }
      } else if (cleanQuery.includes('mm/s') || cleanQuery.includes('vib')) {
        if (val > 4.5) {
          numericContext = ` [UNACCEPTABLE VIBRATION CLASS: ${val} mm/s RMS EXCEEDS ISO 10816 THRESHOLD.]`;
        }
      } else if (cleanQuery.includes('bpm')) {
        if (val > 130) {
          numericContext = ` [TACHYCARDIA ALERT: ${val} BPM EXCEEDS RESTING LIMIT.]`;
        }
      }
    }

    // 2. Score knowledge items using regex matching and token similarity
    let bestMatch: KnowledgeItem | null = null;
    let highestScore = 0;

    for (const item of this.knowledgeBank) {
      const patterns = item.triggerPattern.split('|');
      let score = 0;

      for (const pat of patterns) {
        const cleanPat = pat.trim().toLowerCase();
        if (!cleanPat) continue;

        if (cleanQuery.includes(cleanPat)) {
          score += 20 + cleanPat.length;
        } else {
          const tokens = cleanPat.split(/\s+/);
          for (const t of tokens) {
            if (t.length > 2 && cleanQuery.includes(t)) {
              score += 4;
            }
          }
        }
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatch = item;
      }
    }

    // 3. Simulated INT8 GEMM latency calibration based on MCU clock speed
    const baseLatencyFactor = (480 / Math.max(100, this.targetChip.clockMhz)) * 6.5;
    const artificialJitter = (Math.random() * 2.8) - 1.4;
    const estimatedLatency = Math.max(2.4, +(baseLatencyFactor + artificialJitter).toFixed(2));

    const totalWords = (bestMatch ? bestMatch.responseTemplate.split(' ').length : 40);
    const tokensPerSec = Math.round((totalWords / (estimatedLatency / 1000)));

    // Calculate simulated hardware constraints
    const sramUsed = +(24.2 + (this.knowledgeBank.length * 0.42) + (Math.random() * 1.5)).toFixed(1);
    const flashUsed = +(1420 + (this.knowledgeBank.length * 8.4)).toFixed(0);
    const confidence = bestMatch && highestScore > 10 ? Math.min(99.4, 75 + (highestScore * 1.8)) : 72.5;
    const cyclesEst = Math.round(estimatedLatency * this.targetChip.clockMhz * 1000);
    const powerEst = +(this.targetChip.activePowerMw * (0.85 + Math.random() * 0.25)).toFixed(1);

    const telemetry: InferenceTelemetry = {
      latencyMs: estimatedLatency,
      tokensPerSec: Math.min(480, Math.max(110, tokensPerSec)),
      sramUsedKb: sramUsed,
      flashFootprintKb: Number(flashUsed),
      confidenceScore: +confidence.toFixed(1),
      cpuCyclesEst: cyclesEst,
      powerConsumptionMw: powerEst,
      triggeredAction: bestMatch?.actionCode || (image ? 'DVP_CAMERA_PARSE' : 'IDLE_LISTEN'),
      executionMode: '100% OFFLINE ON-CHIP',
    };

    let responseText = '';
    const asksForCode = /\b(code|program|script|write|implement|example|snippet|syntax|function|class)\b/i.test(cleanQuery);
    const exactMath = this.evaluateExactMath(cleanQuery);
    if (exactMath && highestScore < 18) {
      responseText = `${exactMath.result}${numericContext}`;
    } else if (bestMatch && highestScore >= 6) {
      let template = bestMatch.responseTemplate;
      if (!asksForCode) {
        template = template.replace(/```[\s\S]*?```/g, '').replace(/\n{3,}/g, '\n\n').trim();
      }
      responseText = template + numericContext;
    } else {
      responseText = this.solveOfflineGeneralDoubt(cleanQuery) + numericContext;
    }

    if (image) {
      responseText = `[Optical Sensor Offline Capture]\n` + responseText;
    }

    return { responseText, telemetry };
  }
}
