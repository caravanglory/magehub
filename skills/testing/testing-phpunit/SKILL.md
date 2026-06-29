---
name: testing-phpunit
description: "Write PHPUnit-based unit tests for Magento 2 — setUp with mocks, assertion patterns, data providers, and exception testing without framework bootstrap"
installed_version: 1.0.0
magehub_version: 0.1.13
---

# PHPUnit Unit Tests

### Activation

#### Use When

- The task is to write or update Magento PHPUnit unit tests for isolated PHP classes without framework bootstrap.
- The task mentions Test/Unit, PHPUnit mocks, data providers, exception assertions, or testing service logic.

#### Do Not Use When

- The behavior requires Magento integration tests, database fixtures, web API functional tests, or full ObjectManager bootstrap.
- The task is only to manually smoke-test UI behavior.

#### Required Inputs

- Class under test, constructor dependencies, observable behavior, edge cases, and the project PHPUnit version/config path.
- Whether collaborators should be mocks, stubs, real value objects, or in-memory fakes.

### Workflow

1. Read the production class and nearby tests before deciding the test shape.
2. Instantiate the real class under test with mocks for direct dependencies only.
3. Assert behavior, return values, state changes, exceptions, and meaningful collaborator side effects.
4. Use data providers for repeated input matrices and keep test method names behavior-oriented.

### Guardrails

- Do not use ObjectManager, Magento bootstrap, database fixtures, or integration-test helpers in unit tests.
- Do not mock the class under test.
- Ask before refactoring production code solely to make tests pass when the behavior contract is unclear. (approval required)

### Verification

- Run the targeted PHPUnit test file or Test/Unit directory through the project environment wrapper.
- Run a broader suite when shared service behavior or public APIs are touched.
- Report skipped tests or unavailable PHPUnit config explicitly.

### Output Contract

- State test files added/updated, behaviors covered, mocks used, and exact PHPUnit command result.
- Call out coverage gaps that remain outside unit-test scope.

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

### Conventions

- Mock only direct constructor dependencies of the class under test
  Example: createMock(ProductRepositoryInterface::class) for a service that injects ProductRepositoryInterface
  Rationale: Mocking indirect dependencies (dependencies of dependencies) couples the test to internal implementation. If the collaborator's internals change, the test breaks despite the subject's behavior being correct.
- Mirror the production namespace under Test/Unit/ for every test class
  Example: Vendor\Module\Test\Unit\Model\DataExporterTest tests Vendor\Module\Model\DataExporter
  Rationale: Consistent namespace mirroring makes test discovery automatic and helps developers locate the test for any given class without searching.
- Use data providers for testing multiple input/output combinations instead of duplicating test methods
  Example: @dataProvider invalidInputProvider on a validation test method
  Rationale: Data providers make the test matrix explicit, reduce code duplication, and produce clearer failure messages that identify which input case failed.

### Examples

#### Service test with setUp and mocks

Complete unit test for a service class demonstrating mock creation in setUp, method stubbing, and result assertion

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Test\Unit\Model;

use Magento\Catalog\Api\Data\ProductInterface;
use Magento\Catalog\Api\ProductRepositoryInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Vendor\Module\Model\ProductDataExporter;

class ProductDataExporterTest extends TestCase
{
    private ProductRepositoryInterface&MockObject $productRepository;
    private ProductDataExporter $subject;

    protected function setUp(): void
    {
        $this->productRepository = $this->createMock(ProductRepositoryInterface::class);
        $this->subject = new ProductDataExporter($this->productRepository);
    }

    public function testGetProductNameReturnsNameFromRepository(): void
    {
        $product = $this->createMock(ProductInterface::class);
        $product->method('getName')->willReturn('Test Product');

        $this->productRepository
            ->method('getById')
            ->with(42)
            ->willReturn($product);

        $result = $this->subject->getProductName(42);

        $this->assertSame('Test Product', $result);
    }
}
```

#### Exception testing

Test that verifies a service throws the expected exception with a specific message when given invalid input

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Test\Unit\Model;

use Magento\Framework\Exception\NoSuchEntityException;
use Magento\Catalog\Api\ProductRepositoryInterface;
use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use Vendor\Module\Model\ProductDataExporter;

class ProductDataExporterExceptionTest extends TestCase
{
    private ProductRepositoryInterface&MockObject $productRepository;
    private ProductDataExporter $subject;

    protected function setUp(): void
    {
        $this->productRepository = $this->createMock(ProductRepositoryInterface::class);
        $this->subject = new ProductDataExporter($this->productRepository);
    }

    public function testGetProductNameThrowsWhenProductNotFound(): void
    {
        $this->productRepository
            ->method('getById')
            ->with(999)
            ->willThrowException(
                new NoSuchEntityException(__('No such entity with id = 999'))
            );

        $this->expectException(NoSuchEntityException::class);
        $this->expectExceptionMessage('No such entity with id = 999');

        $this->subject->getProductName(999);
    }
}
```

#### Data provider for input validation

Test using a data provider to verify validation logic against multiple invalid input scenarios

```php
<?php
declare(strict_types=1);

namespace Vendor\Module\Test\Unit\Model;

use PHPUnit\Framework\TestCase;
use Vendor\Module\Model\InputValidator;

class InputValidatorTest extends TestCase
{
    private InputValidator $subject;

    protected function setUp(): void
    {
        $this->subject = new InputValidator();
    }

    /**
     * @dataProvider invalidInputProvider
     */
    public function testValidateRejectsInvalidInput(
        string $input,
        string $expectedError
    ): void {
        $result = $this->subject->validate($input);

        $this->assertFalse($result->isValid());
        $this->assertSame($expectedError, $result->getError());
    }

    /**
     * @return array<string, array{string, string}>
     */
    public static function invalidInputProvider(): array
    {
        return [
            'empty string' => ['', 'Input cannot be empty'],
            'exceeds max length' => [str_repeat('a', 256), 'Input exceeds 255 characters'],
            'contains HTML' => ['<script>alert(1)</script>', 'Input contains invalid characters'],
        ];
    }
}
```


### Anti-patterns

- Using ObjectManager or Bootstrap in unit tests: ObjectManager requires the full Magento framework to initialize, adding 10-30 seconds of bootstrap time per test run. Unit tests should run in milliseconds. Framework coupling masks design issues by hiding implicit dependencies.
  Solution: Inject all dependencies through the constructor and mock them in setUp(). If a class cannot be instantiated without ObjectManager, refactor it to accept interface-typed constructor parameters.
- Mocking the class under test instead of its dependencies: Mocking the subject creates a test that verifies mock behavior, not production behavior. The test passes even if the real class is completely broken because the mock's stubbed methods always return the expected values.
  Solution: Instantiate the real class under test with mocked dependencies. Only mock the collaborators that are injected through the constructor.
- Writing assertions against implementation details instead of behavior: Tests that assert specific method call sequences or argument counts break when internal refactoring occurs, even though the observable behavior is unchanged. This creates a high maintenance burden and false failures.
  Solution: Assert outcomes: return values, state changes, or thrown exceptions.
Use expects($this->once()) only when verifying that a side-effect
(like saving to a repository) actually occurs, not for internal calls.


### File Templates

#### Test/Unit/Model/<className>Test.php

Path template:

```text
Test/Unit/Model/{{className}}Test.php
```

PHPUnit test class with setUp, mock creation, and a basic test method

```php
<?php
declare(strict_types=1);

namespace {{vendor}}\{{module}}\Test\Unit\Model;

use PHPUnit\Framework\MockObject\MockObject;
use PHPUnit\Framework\TestCase;
use {{vendor}}\{{module}}\Model\{{className}};

class {{className}}Test extends TestCase
{
    private {{className}} $subject;

    protected function setUp(): void
    {
        $this->subject = new {{className}}();
    }

    public function testExpectedBehavior(): void
    {
        $this->markTestIncomplete('Implement test logic');
    }
}
```

#### phpunit.xml

Path template:

```text
phpunit.xml
```

PHPUnit configuration scoped to the module's unit test directory

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/10.5/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="{{module}} Unit Tests">
            <directory>Test/Unit</directory>
        </testsuite>
    </testsuites>
</phpunit>
```


### References

- [PHPUnit documentation](https://docs.phpunit.de/)
- [Adobe Commerce: Unit testing](https://developer.adobe.com/commerce/testing/guide/unit/)

### Freshness

- Last reviewed: 2026-06-28
- Sources to re-check: PHPUnit current documentation, Adobe Commerce 2.4.x testing guide
