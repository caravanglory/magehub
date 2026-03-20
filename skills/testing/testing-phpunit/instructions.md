### Magento 2 Unit Test Strategy

Unit tests validate individual classes in isolation without the Magento
framework, database, or object manager. They run in milliseconds and catch
logic errors immediately. Place test classes in `Test/Unit/` mirroring the
production namespace.

### Test Class Setup

Extend `PHPUnit\Framework\TestCase`. Create mocks for all constructor
dependencies in `setUp()` and instantiate the subject under test with those
mocks. Use `createMock()` for interface dependencies and `createPartialMock()`
only when testing a class that needs real method behavior alongside stubs.

### Mock Configuration

Configure mock return values with `method()->willReturn()`. Use
`expects($this->once())` to verify interaction count when the test's purpose
is to confirm a collaborator is called. Avoid over-specifying mock
expectations — assert outcomes (return values, state changes) rather than
implementation details where possible.

### Data Providers

Use `@dataProvider` to run the same test logic against multiple input/output
combinations. Data provider methods are public, return an array of arrays,
and are named to describe the data set. Data providers reduce test
duplication and make edge case coverage explicit.

### Exception Testing

Call `$this->expectException(ExceptionClass::class)` before the code that
should throw. Optionally use `expectExceptionMessage()` to verify the error
text. For Magento-specific exceptions like `NoSuchEntityException` or
`CouldNotSaveException`, import the full class and test both the exception
type and its message.

### Avoiding Framework Bootstrap

Never use `Magento\TestFramework\Helper\Bootstrap` or `ObjectManager` in
unit tests. These belong to integration tests. If a class cannot be
instantiated without the full framework, it has too many hard dependencies
— refactor to inject interfaces that can be mocked.
