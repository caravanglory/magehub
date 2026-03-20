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
