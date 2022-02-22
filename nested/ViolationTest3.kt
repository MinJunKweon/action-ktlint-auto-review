// ViolationTest3.kt
import java.math.BigDecimal
import kotlinx.coroutines.*
import java.util.* // ktlint-disable no-wildcard-imports

abstract class Parent() // 456

/* ktlint-disable colon-spacing */
data class Data(
    val foo : Int,
    val bar: Int
): Parent()
/* ktlint-enable colon-spacing */

fun main() {
    val number : BigDecimal = BigDecimal(10)
    println(number)
}
